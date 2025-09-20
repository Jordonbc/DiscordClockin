pub fn redact_user_id(user_id: &str) -> &'static str {
    if user_id.is_empty() {
        "[redacted-empty]"
    } else {
        "[redacted]"
    }
}
