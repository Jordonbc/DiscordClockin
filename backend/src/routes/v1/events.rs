use std::collections::HashSet;
use std::sync::Arc;

use actix_web::{HttpResponse, get, web};
use log::{info, warn};
use serde::Deserialize;
use serde::de::{Deserializer, Error as DeError, SeqAccess, Visitor};
use tokio::time::{Duration, interval};
use tokio_stream::StreamExt;
use tokio_stream::wrappers::{BroadcastStream, IntervalStream};

use crate::events::HookEvent;
use crate::state::AppState;

#[derive(Debug, Deserialize, Default)]
pub struct StreamEventsQuery {
    #[serde(default)]
    pub guild_id: Option<String>,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_events")]
    pub event: Vec<String>,
}

#[get("/events/stream")]
pub async fn stream_events(
    state: web::Data<AppState>,
    query: web::Query<StreamEventsQuery>,
) -> HttpResponse {
    let receiver = state.events.subscribe();
    let filters = Arc::new(StreamFilters::from_query(query.into_inner()));
    info!("SSE client subscribed to clock events");

    let event_stream = BroadcastStream::new(receiver).filter_map(move |result| {
        let filters = filters.clone();
        match result {
            Ok(event) if filters.matches(&event) => match serde_json::to_string(&event) {
                Ok(json) => Some(Ok::<_, actix_web::Error>(web::Bytes::from(format!(
                    "data: {json}\n\n"
                )))),
                Err(err) => Some(Err(actix_web::error::ErrorInternalServerError(err))),
            },
            Ok(_) => None,
            Err(err) => {
                warn!("Dropping event stream payload: {err}");
                None
            }
        }
    });

    let heartbeat_stream = IntervalStream::new(interval(Duration::from_secs(30)))
        .map(|_| Ok::<_, actix_web::Error>(web::Bytes::from_static(b": keep-alive\n\n")));

    let merged = event_stream.merge(heartbeat_stream);

    HttpResponse::Ok()
        .append_header((actix_web::http::header::CONTENT_TYPE, "text/event-stream"))
        .append_header((actix_web::http::header::CACHE_CONTROL, "no-cache"))
        .append_header((actix_web::http::header::CONNECTION, "keep-alive"))
        .streaming(Box::pin(merged))
}

#[derive(Debug)]
struct StreamFilters {
    guild_id: Option<String>,
    user_id: Option<String>,
    actions: HashSet<String>,
}

impl StreamFilters {
    fn from_query(query: StreamEventsQuery) -> Self {
        let actions = query
            .event
            .into_iter()
            .flat_map(|value| {
                value
                    .split(',')
                    .map(|item| item.trim().to_ascii_lowercase())
                    .filter(|item| !item.is_empty())
                    .collect::<Vec<_>>()
            })
            .collect();

        Self {
            guild_id: query.guild_id.and_then(normalize_filter_value),
            user_id: query.user_id.and_then(normalize_filter_value),
            actions,
        }
    }

    fn matches(&self, event: &HookEvent) -> bool {
        if let Some(guild) = &self.guild_id {
            if guild != &event.guild_id {
                return false;
            }
        }

        if let Some(user) = &self.user_id {
            if user != &event.user_id {
                return false;
            }
        }

        event.matches_action(&self.actions)
    }
}

fn normalize_filter_value(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn deserialize_events<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    struct EventsVisitor;

    impl<'de> Visitor<'de> for EventsVisitor {
        type Value = Vec<String>;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("string or sequence of event names")
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: DeError,
        {
            Ok(vec![value.to_string()])
        }

        fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
        where
            E: DeError,
        {
            Ok(vec![value])
        }

        fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
        where
            A: SeqAccess<'de>,
        {
            let mut values = Vec::new();
            while let Some(value) = seq.next_element::<String>()? {
                values.push(value);
            }
            Ok(values)
        }
    }

    deserializer.deserialize_any(EventsVisitor)
}
