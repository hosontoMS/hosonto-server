const auth_messages = {
  login_required: "<h3>You must login first to complete this request. </h3>",
  no_such_user: "User not found! Please try with a valid username.",
  no_registered_email: `There is no user for the email address you provided. Please provide the registered email.`,
  retrieval_email_sent: `An email has been sent to the address you've provided. Please follow the retrieval instructions in the email.`,
  email_sent: `An email has been sent to the address you've provided. Please follow the instructions in the email to complete your request.`,
  invalid_email: "Invalid email. Please provide a valid email address.",
  invalid_code:
    "Invalid password reset request. Please use the latest code sent to your registered email.",
  mismatched_password:
    "Password and verify field do not match. Please try with same password.",
  update_success: "<h3>Password successfully updated.</h3>",
  user_exists: "Sorry! User already registered using the id you provided.",
  invalid_length: "Password must be six characters or more. ",
  number_required: "Password must contain one or more numbers. ",
  mixed_cases_required:
    "Password must contain a combination of lower and upper cases.\n",
  registration_success: "<h3>Registration Successful.</h3>",
  welcome_message: (username) =>
    `${username}, welcome to annoface: the first and free data sharing platform. `,
  validate_email: (
    username,
    userid,
    code,
    link
  ) => `<h3>Hi ${username}, Your verification code is:</h3> <h1>${code}</h1> <br> 
                    <h3>Click the link below to verify.<br>
                    <a href="${link}id/${userid}/${code}">Verify now</a></h3>`,
  verify_success: (link) =>
    `<h3>Thank you! You have successfully verified your email now. </h3>`,
  verify_failed: (link) => `<h3>Your code is incorrect. <br> 
                    Please try again. Or register for a new account.
                    <a href="${link}?">Register here</a></h3>`,
  verify_error: (err, link) => `<h3>Some errors occurred during verification. 
 ${err} 
  Please try again. Or register for a new account.
                    <a href="${link}?">Register here</a></h3>`,

  subject_change_password: (username) =>
    `${username}! Your change password link is here.`,
  change_password_email: (
    username,
    userid,
    code,
    link
  ) => `<h3>Hi ${username}, </h3> <br> 
                      <h3>We've receieved your change password request. Click the link below to change your password.</h3><h1><br>
                      <a href="${link}id/${userid}/${code}">Change password now</a></h1><br>
                      <h3>Annoface</h3><br>
                      `,
};

module.exports = auth_messages;
