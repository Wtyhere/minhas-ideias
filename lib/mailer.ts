import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  name?: string;
  code: string;
}

export interface MailerResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Cria o transporte do nodemailer se as credenciais SMTP estiverem definidas no ambiente.
 */
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Envia o e-mail com código de redefinição de senha.
 * Se SMTP não estiver configurado, loga o código no console para ambiente de testes/desenvolvimento.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  code,
}: SendEmailOptions): Promise<MailerResult> {
  const cleanEmail = to.trim().toLowerCase();
  const displayName = name ? name.trim() : cleanEmail.split('@')[0];
  const formattedCode = code.trim();

  const transporter = getSmtpTransporter();

  // HTML com visual moderno alinhado ao Minhas Ideias na CM (Esmeralda / Teal)
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperação de Senha - Minhas Ideias na CM</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #1e293b;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .code-box {
      background: #f0fdf4;
      border: 2px dashed #86efac;
      border-radius: 14px;
      padding: 24px 16px;
      text-align: center;
      margin: 0 0 24px 0;
    }
    .code-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #166534;
      margin-bottom: 8px;
    }
    .code-number {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #047857;
      margin: 0;
    }
    .warning {
      font-size: 12px;
      line-height: 1.5;
      color: #64748b;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 10px;
      border-left: 3px solid #0d9488;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background-color: #fcfdfe;
    }
    .footer b {
      color: #059669;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Minhas Ideias na CM</h1>
      <p>Sua voz constrói o futuro do Varejofacil</p>
    </div>
    <div class="content">
      <div class="greeting">Olá, ${displayName}!</div>
      <p class="text">
        Recebemos uma solicitação para redefinir a senha da sua conta no portal <strong>Minhas Ideias na CM</strong>.
        Use o código de verificação abaixo para confirmar sua identidade e criar uma nova senha:
      </p>

      <div class="code-box">
        <div class="code-label">Seu Código de Verificação</div>
        <div class="code-number">${formattedCode}</div>
      </div>

      <div class="warning">
        ⏱️ Este código expira em <strong>15 minutos</strong>.<br>
        🔒 Se você não solicitou esta redefinição de senha, ignore este e-mail. Sua conta e senha continuam em segurança.
      </div>
    </div>
    <div class="footer">
      <b>Casa Magalhães</b> • Minhas Ideias na CM<br>
      Este é um e-mail automático, por favor não responda.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Olá, ${displayName}!

Recebemos uma solicitação para redefinir a senha da sua conta no portal Minhas Ideias na CM.

Seu código de verificação é: ${formattedCode}

Este código expira em 15 minutos.
Se você não solicitou esta redefinição de senha, pode ignorar este e-mail com segurança.

Casa Magalhães • Minhas Ideias na CM
  `.trim();

  // Se o transporte SMTP não estiver configurado, simula e loga no console
  if (!transporter) {
    console.log('\n===============================================================');
    console.log('📧 [RECUPERAÇÃO DE SENHA - SIMULAÇÃO DE ENVIO DE E-MAIL]');
    console.log(`Para: ${cleanEmail} (${displayName})`);
    console.log(`Código de Verificação: ${formattedCode}`);
    console.log('Expira em: 15 minutos');
    console.log('Dica: Para envio real via SMTP, configure SMTP_HOST, SMTP_PORT,');
    console.log('SMTP_USER e SMTP_PASS no seu arquivo .env.local.');
    console.log('===============================================================\n');

    return {
      success: true,
      simulated: true,
    };
  }

  try {
    const from = process.env.SMTP_FROM || `"Minhas Ideias na CM" <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from,
      to: cleanEmail,
      subject: `Código de verificação: ${formattedCode} - Minhas Ideias na CM`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[sendPasswordResetEmail] E-mail enviado para ${cleanEmail}. MessageId: ${info.messageId}`);

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error('[sendPasswordResetEmail] Erro ao enviar e-mail via SMTP:', err);
    // Mesmo se o SMTP falhar, loga no console para não travar o desenvolvimento
    console.log('\n===============================================================');
    console.log('⚠️ [FALHA NO SMTP - CÓDIGO CAPTURADO EM FALLBACK]');
    console.log(`Destinatário: ${cleanEmail}`);
    console.log(`Código: ${formattedCode}`);
    console.log('===============================================================\n');

    return {
      success: false,
      simulated: true,
      error: err?.message || 'Falha ao enviar e-mail pelo servidor SMTP.',
    };
  }
}
