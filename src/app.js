import Auth from "@aws-amplify/auth";
import Analytics from "@aws-amplify/analytics";
import AWS, { Pinpoint } from "aws-sdk";

import awsconfig from "./aws-exports";

// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);
// send analytics events to Amazon Pinpoint
Analytics.configure(awsconfig);

window.onload = function() {
  createSignupSigninScreen(document.getElementById("app"));
};

const createValidateScreen = (element, username, password) => {
  clearElement(element);
  const validateScreen = ` 
    <label for="code"><b>Enter Validation code</b></label>
    <input id="validationCode" type="text" placeholder="code" name="code" required>

    <button id="validate" type="submit">Validate</button> 
  `;
  element.innerHTML = validateScreen;
  setupValidationFields(element, username, password);
};

const setupValidationFields = (element, username, password) => {
  const validateInput = document.getElementById("validationCode");
  const validateBtn = document.getElementById("validate");
  validateBtn.addEventListener("click", evt => {
    const code = validateInput.value;
    Auth.confirmSignUp(username, code)
      .then(data => {
        if (data === "SUCCESS") {
          signInThenAdvance(element, username, password);
        }
      })
      .catch(error => console.error(error));
  });
};

const createSignupSigninScreen = element => {
  clearElement(element);
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
  element.innerHTML = signupScreen + signinScreen;
  setupSignupFields(element);
  setupSigninFields(element);
};

const setupSigninFields = element => {
  const signinBtn = document.getElementById("signin");
  const usernameElement = document.getElementById("signinUsername");
  const passwordElement = document.getElementById("signinPassword");
  signinBtn.addEventListener("click", evt => {
    const email = usernameElement.value;
    const password = passwordElement.value;
    signInThenAdvance(element, email, password);
  });
};

const signInThenAdvance = (element, email, password) => {
  Auth.signIn(email, password)
    .then(user => {
      pinpointUpdateEndpoint(email);
      setupSignoutAndDelete(element, user);
    })
    .catch(err => console.error(err));
};

const setupSignupFields = element => {
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
        console.log(data);
        createValidateScreen(element, email, password);
      })
      .catch(err => console.error(err));
  });
};

const setupSignoutAndDelete = (element, user) => {
  clearElement(element);
  const signoutScreen = `
    <div>
      <button id="signout">Sign out</button> 
      <button id="delete">Delete user</button> 
      <p>Signed in as: ${user["username"]}</p>
    </div>
  `;
  element.innerHTML = signoutScreen;
  setupSignoutButton(element);
  setupDeleteButton(element, user);
};

const setupDeleteButton = element => {
  const deleteBtn = document.getElementById("delete");
  deleteBtn.addEventListener("click", evt => {
    Auth.currentAuthenticatedUser().then(user => {
      user.deleteUser();
      signoutThenGoBack(element);
    });
  });
};

const setupSignoutButton = element => {
  const signoutBtn = document.getElementById("signout");
  signoutBtn.addEventListener("click", evt => {
    signoutThenGoBack(element);
  });
};

const signoutThenGoBack = element => {
  Auth.signOut().then(() => {
    createSignupSigninScreen(element);
  });
};

const clearElement = element => {
  element.innerHTML = "";
};

const pinpointUpdateEndpoint = async email => {
  const credentials = await Auth.currentUserCredentials();
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
};
