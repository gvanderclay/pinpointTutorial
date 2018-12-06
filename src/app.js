import Auth from "@aws-amplify/auth";
import Analytics from "@aws-amplify/analytics";
import { Pinpoint } from "aws-sdk";

import awsconfig from "./aws-exports";

// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);
// send analytics events to Amazon Pinpoint
Analytics.configure(awsconfig);

window.onload = function() {
  createSignupSigninScreen(document.getElementById("app"));
};

const createSignupSigninScreen = () => {
  clearApp();
  const signupScreen = `
    <div>
      <label for="uname"><b>email</b></label>
      <input id="signupUsername" type="text" placeholder="Enter Username" name="uname" required>

      <label for="psw"><b>Password</b></label>
      <input id="signupPassword" type="password" placeholder="Enter Password" name="psw" required>

      <button id="signup" type="submit">Create user</button>
    </div>
  `;

  const signinScreen = `
    <div>
      <label for="uname"><b>email</b></label>
      <input id="signinUsername" type="text" placeholder="Enter Username" name="uname" required>

      <label for="psw"><b>Password</b></label>
      <input id="signinPassword" type="password" placeholder="Enter Password" name="psw" required>

      <button id="signin" type="submit">Sign in</button> 
    </div>
  `;
  setApp(signupScreen + signinScreen);
  setupSignupFields();
  setupSigninFields();
};

const setupSignupFields = () => {
  const signupBtn = document.getElementById("signup");
  const usernameElement = document.getElementById("signupUsername");
  const passwordElement = document.getElementById("signupPassword");
  signupBtn.addEventListener("click", evt => {
    const email = usernameElement.value;
    const password = passwordElement.value;
    Auth.signUp({
      username: email,
      password,
      attributes: {
        email
      }
    })
      .then(data => {
        clearErrors();
        createValidateScreen(email, password);
      })
      .catch(err => {
        console.error(err);
        setErrors(err);
      });
  });
};

const setupSigninFields = () => {
  const signinBtn = document.getElementById("signin");
  const usernameElement = document.getElementById("signinUsername");
  const passwordElement = document.getElementById("signinPassword");
  signinBtn.addEventListener("click", evt => {
    const email = usernameElement.value;
    const password = passwordElement.value;
    signInThenAdvance(email, password);
  });
};

const createValidateScreen = (username, password) => {
  clearApp();
  const validateScreen = ` 
    <label for="code"><b>Enter Validation code</b></label>
    <input id="validationCode" type="text" placeholder="code" name="code" required>

    <button id="validate" type="submit">Validate</button> 
  `;
  setApp(validateScreen);
  setupValidationFields(username, password);
};

const setupValidationFields = (username, password) => {
  const validateInput = document.getElementById("validationCode");
  const validateBtn = document.getElementById("validate");
  validateBtn.addEventListener("click", evt => {
    const code = validateInput.value;
    Auth.confirmSignUp(username, code)
      .then(data => {
        if (data === "SUCCESS") {
          signInThenAdvance(username, password);
        }
      })
      .catch(error => {
        console.error(error);
        setErrors(error);
      });
  });
};

const signInThenAdvance = (email, password) => {
  clearErrors();
  Auth.signIn(email, password)
    .then(user => {
      pinpointUpdateEndpoint(email);
      setupSignoutAndDelete(user);
    })
    .catch(err => {
      console.error(err);
      setErrors(err);
    });
};

const setupSignoutAndDelete = user => {
  clearApp();
  const signoutScreen = `
    <div>
      <button id="signout">Sign out</button> 
      <button id="delete">Delete user</button> 
      <p>Signed in as: ${user["username"]}</p>
    </div>
  `;
  setApp(signoutScreen);
  setupSignoutButton();
  setupDeleteButton(user);
};

const setupSignoutButton = () => {
  const signoutBtn = document.getElementById("signout");
  signoutBtn.addEventListener("click", evt => {
    signoutThenGoBack();
  });
};

const setupDeleteButton = () => {
  const deleteBtn = document.getElementById("delete");
  deleteBtn.addEventListener("click", evt => {
    Auth.currentAuthenticatedUser().then(user => {
      user.deleteUser();
      signoutThenGoBack();
    });
  });
};

const signoutThenGoBack = () => {
  Auth.signOut().then(() => {
    createSignupSigninScreen();
  });
};

const setErrors = content => {
  document.getElementById("errors").innerHTML = JSON.stringify(
    content,
    null,
    2
  );
};

const clearErrors = () => {
  document.getElementById("errors").innerHTML = "";
};

const setApp = content => {
  document.getElementById("app").innerHTML = content;
};

const clearApp = () => {
  document.getElementById("app").innerHTML = "";
};

const pinpointUpdateEndpoint = email => {
  Auth.currentUserCredentials().then(credentials => {
    if (credentials.identityId === undefined) {
      console.warn("no identityId");
      return;
    }
    const pinpoint = new Pinpoint({
      region: awsconfig.aws_mobile_analytics_app_region,
      credentials
    });
    const { identityId } = credentials;
    const channelType = "EMAIL";
    pinpoint
      .updateEndpoint({
        ApplicationId: awsconfig.aws_mobile_analytics_app_id,
        EndpointId: `email-endpoint-${identityId}`,
        EndpointRequest: {
          Address: email,
          ChannelType: channelType,
          OptOut: "NONE",
          User: {
            UserId: identityId,
            UserAttributes: {}
          }
        }
      })
      .promise()
      .then(data => console.log(data))
      .catch(err => console.error(err));
  });
};
