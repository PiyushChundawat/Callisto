type EmailInput = {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
  
  async function sendViaRelay(input: EmailInput, url: string, secret: string) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secret,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      redirect: "follow",
    });
  
    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  
    if (!response.ok || !data || data.ok !== true) {
      throw new Error("Mail relay failed: " + response.status + " " + raw.slice(0, 200));
    }
  }
  
  async function sendViaBrevo(input: EmailInput, apiKey: string, fromEmail: string) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Callisto", email: fromEmail },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
    });
  
    if (!response.ok) {
      const detail = await response.text();
      throw new Error("Brevo " + response.status + ": " + detail);
    }
  }
  
  export async function sendEmail(input: EmailInput) {
    // Order: Google Apps Script relay, then Brevo, then print to the terminal.
    // Render's free tier blocks SMTP, so both real options use HTTPS.
    const relayUrl = process.env.MAIL_RELAY_URL;
    const relaySecret = process.env.MAIL_RELAY_SECRET;
    if (relayUrl && relaySecret) {
      await sendViaRelay(input, relayUrl, relaySecret);
      return;
    }
  
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    if (apiKey && fromEmail) {
      await sendViaBrevo(input, apiKey, fromEmail);
      return;
    }
  
    if (!process.env.RENDER) {
      console.log("[email:dev] To:", input.to, "| Subject:", input.subject);
      console.log(input.text);
      return;
    }
  
    throw new Error("Email is not configured: set MAIL_RELAY_URL and MAIL_RELAY_SECRET");
  }