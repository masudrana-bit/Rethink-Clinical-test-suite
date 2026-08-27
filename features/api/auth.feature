@auth
Feature: Authentication
  As the test suite
  I need a valid session
  So that protected API and UI flows can run

  @api @smoke @auth
  Scenario: API login returns a token
    When I log in via the auth API with valid dev credentials
    Then the login response status is 200
    And the response contains an access token

  @api @auth
  Scenario: Refresh token succeeds
    Given I am logged in via the auth API
    When I request a refreshed token
    Then the refresh response status is 200
    And the response contains an access token

  @api @auth
  Scenario: Staff role is returned for the current user
    Given I am logged in via the auth API
    When I GET "/accounts/v1/members/me/staff-role"
    Then the response status is 200
    And the body contains "accountRole"
    And the body contains "userName"

  @ui @smoke @auth
  Scenario: UI login lands on the clients page
    When I open the temp dev login page and authenticate
    Then I am redirected to the clients page
    And the clients list is visible
