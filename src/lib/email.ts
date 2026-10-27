type EmailInput = {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
  
  export async function sendEmail(input: EmailInput) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
  
    if (!apiKey || !fromEmail) {
      // Render sets RENDER=true. Outside Render, print the email instead,
      // so the flow can be tested without an email provider.
      if (!process.env.RENDER) {
        console.log("[email:dev] To:", input.to, "| Subject:", input.subject);
        console.log(input.text);
        return;
      }
      throw new Error("Email is not configured: BREVO_API_KEY or EMAIL_FROM is missing");
    }
  
    // HTTPS API instead of SMTP, because Render's free tier blocks SMTP ports.
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