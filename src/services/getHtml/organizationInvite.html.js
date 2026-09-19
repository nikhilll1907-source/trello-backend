export const getOrganizationInviteHtml = (
  organizationName,
  inviterName,
  membershipId
) => {
  const inviteUrl = `http://localhost:3000/invitations/accept/${membershipId}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Organization Invitation</title>
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
            ">
              Trello
            </h1>

            <h2 style="
              text-align: center;
              color: #111827;
            ">
              You're Invited!
            </h2>

            <p style="
              color: #4b5563;
              font-size: 16px;
              line-height: 1.6;
            ">
              <strong>${inviterName}</strong> has invited you to join
              <strong>${organizationName}</strong>.
            </p>

            <div style="
              text-align: center;
              margin: 30px 0;
            ">
              <a
                href="${inviteUrl}"
                style="
                  display: inline-block;
                  padding: 14px 28px;
                  background-color: #2563eb;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: bold;
                "
              >
                Accept Invitation
              </a>
            </div>

            <p style="
              color: #6b7280;
              font-size: 14px;
              line-height: 1.6;
              text-align: center;
            ">
              Click the button above to accept the invitation and join
              <strong>${organizationName}</strong>.
            </p>

            <p style="
              color: #9ca3af;
              font-size: 12px;
              text-align: center;
              margin-top: 30px;
            ">
              If you did not expect this invitation, you can safely ignore
              this email.
            </p>

          </div>

          <p style="
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            margin-top: 20px;
          ">
            © ${new Date().getFullYear()} Trello
          </p>

        </div>

      </body>
    </html>
  `;
};