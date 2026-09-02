@auth
Feature: Authentication
  Unit 1. The suite obtains its session by driving the preview sign-in (D1).
  These scenarios assert the session contract the app depends on, and that
  protected routes stay closed to an unauthenticated visitor.

  @api @smoke @auth
  Scenario: The issued session is well formed
    Then the session carries an access token and a refresh token
    And the access token expires in the future
    And the refresh token outlives the access token

  @api @auth
  Scenario: A refresh token exchanges for a new session
    When I exchange the refresh token for a new session
    Then the exchange returns a complete set of tokens
    And the new access token differs from the previous one
    And the new access token is accepted by the API

  @ui @smoke @auth
  @signed-out
  Scenario: The preview sign-in lands an unauthenticated visitor on the clients page
    When an unauthenticated visitor opens the preview sign-in
    Then they arrive on the clients page
    And the app shell shows a signed-in user

  @api @auth
  Scenario: Staff role identifies the current user
    When I request the current user's staff role
    Then the response status is 200
    And the content type includes "x-api-version=1"
    And the staff role names a role and a user

  @ui @negative @auth
  @signed-out
  Scenario: A protected client record is closed to an unauthenticated visitor
    When an unauthenticated visitor opens a client's analyze-data page directly
    Then the sign-in page is shown
    And no client record content is rendered
