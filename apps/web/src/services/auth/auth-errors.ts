export function getAuthErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }

  return "";
}

export function getGermanAuthErrorMessage(error: unknown): string {
  const name = getAuthErrorName(error);
  const message = error instanceof Error ? error.message : "";

  if (
    name === "NotAuthorizedException" ||
    name === "UserNotFoundException" ||
    message.toLowerCase().includes("incorrect username or password")
  ) {
    return "E-Mail oder Passwort ist falsch.";
  }

  if (name === "UserAlreadyAuthenticatedException") {
    return "Du bist bereits angemeldet.";
  }

  if (name === "UserNotConfirmedException") {
    return "Dein Konto ist noch nicht bestätigt.";
  }

  if (name === "UsernameExistsException") {
    return "Für diese E-Mail existiert bereits ein Konto.";
  }

  if (name === "CodeMismatchException") {
    return "Der Bestätigungscode ist nicht korrekt.";
  }

  if (name === "ExpiredCodeException") {
    return "Der Code ist abgelaufen. Bitte fordere einen neuen Code an.";
  }

  if (name === "InvalidPasswordException") {
    return "Das Passwort erfüllt die Anforderungen noch nicht.";
  }

  if (name === "LimitExceededException" || name === "TooManyRequestsException") {
    return "Zu viele Versuche. Bitte warte kurz und probiere es erneut.";
  }

  if (name === "PasswordResetRequiredException") {
    return "Bitte setze dein Passwort zurück, bevor du dich anmeldest.";
  }

  return "Die Aktion konnte nicht abgeschlossen werden. Bitte probiere es erneut.";
}
