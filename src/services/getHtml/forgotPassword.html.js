export const getForgotPasswordHtml = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f4f5;
        font-family: Arial, Helvetica, sans-serif;
      ">

        <div style="
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
        ">

          <div style="
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          ">

            <h1 style="
              text-align: center;
              color: #111827;
              margin-bottom: 10px;
            ">
              Reset Your Password
            </h1>

            <p style="
              text-align: center;
              color: #6b7280;
              font-size: 16px;
            ">
              Use the OTP below to reset your password.
            </p>

            <div style="
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background-color: #f3f4f6;
              border-radius: 10px;
            ">
              <h2 style="
                margin: 0;
                font-size: 32px;
                letter-spacing: 8px;
                color: #111827;
              ">
                ${otp}
              </h2>
            </div>

            <p style="
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            ">
              This OTP will expire in 10 minutes.
            </p>

            <p style="
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
              margin-top: 30px;
            ">
              If you did not request a password reset, you can safely ignore
              this email.
            </p>

          </div>

        </div>

      </body>
    </html>
  `;
};