import aiosmtplib
from email.message import EmailMessage
from app.config.settings import get_settings


async def send_absence_notification(
    parent_email: str,
    student_name: str,
    roll_no: str,
    subject_name: str,
    date: str,
):
    """Send absence notification email to parent (async, non-blocking)."""
    settings = get_settings()

    if not settings.SMTP_USER or not settings.SMTP_PASS:
        print("⚠️  SMTP credentials not configured. Skipping email.")
        return {"success": False, "error": "SMTP not configured"}

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c0392b;">📋 Attendance Absence Notification</h2>
        <p>Dear Parent/Guardian,</p>
        <p>This is to inform you that your ward has been marked <strong>absent</strong> in today's class.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr style="background: #f8f9fa;">
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;"><strong>Student Name</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;">{student_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;"><strong>Roll Number</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;">{roll_no}</td>
            </tr>
            <tr style="background: #f8f9fa;">
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;"><strong>Subject</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;">{subject_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;"><strong>Date</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #dee2e6;">{date}</td>
            </tr>
        </table>
        <p>Please ensure regular attendance. If you have any questions, contact the institution.</p>
        <p style="color: #6c757d; font-size: 12px;">This is an automated message from the Attendance Management System.</p>
    </div>
    """

    msg = EmailMessage()
    msg["From"] = f"Attendance System <{settings.EMAIL_FROM}>"
    msg["To"] = parent_email
    msg["Subject"] = f"Absence Alert: {student_name} was absent on {date}"
    msg.set_content(f"{student_name} ({roll_no}) was absent in {subject_name} on {date}.")
    msg.add_alternative(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
        )
        print(f"📧 Absence email sent to {parent_email}")
        return {"success": True}
    except Exception as e:
        print(f"❌ Failed to send email to {parent_email}: {e}")
        return {"success": False, "error": str(e)}
