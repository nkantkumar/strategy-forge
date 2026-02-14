"""Email notifications for strategy entry/exit signals."""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

from app.config import Settings


def send_alert_email(
    subject: str,
    body_text: str,
    to_emails: List[str] | None = None,
    settings: Settings | None = None,
) -> bool:
    """Send an email via SMTP. Returns True if sent, False if skipped or failed."""
    s = settings or Settings()
    if not s.smtp_host or not s.smtp_user or not s.smtp_password:
        return False
    to = to_emails or (s.alert_email_to.split(",") if s.alert_email_to else [])
    if not to:
        return False
    from_addr = s.alert_email_from or s.smtp_user
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to)
    msg.attach(MIMEText(body_text, "plain"))
    try:
        with smtplib.SMTP(s.smtp_host, s.smtp_port) as server:
            if s.smtp_use_tls:
                server.starttls()
            server.login(s.smtp_user, s.smtp_password)
            server.sendmail(from_addr, to, msg.as_string())
        return True
    except Exception:
        return False


def send_entry_signal(strategy_name: str, symbol: str, to_emails: List[str] | None = None) -> bool:
    subject = f"[Strategy Forge] ENTRY signal: {strategy_name} on {symbol}"
    body = f"Entry conditions matched for strategy '{strategy_name}' on {symbol}.\n\nConsider opening a long position (this is not financial advice)."
    return send_alert_email(subject, body, to_emails=to_emails)


def send_exit_signal(strategy_name: str, symbol: str, to_emails: List[str] | None = None) -> bool:
    subject = f"[Strategy Forge] EXIT signal: {strategy_name} on {symbol}"
    body = f"Exit conditions matched for strategy '{strategy_name}' on {symbol}.\n\nConsider closing the position (this is not financial advice)."
    return send_alert_email(subject, body, to_emails=to_emails)
