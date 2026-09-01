@negative
Feature: Negative and error cases
  Unit 6. What the app and the API do when asked for something that is not there,
  or asked without the right to ask.

  @api @negative
  Scenario: An API call without a token is rejected
    Given I have no auth token
    When I GET "/clinical/v1/clients"
    Then the response status is 401

  @api @negative
  Scenario: An API call with a malformed token is rejected
    Given I have a malformed auth token
    When I GET "/clinical/v1/clients"
    Then the response status is 401

  @api @negative @endpoint-coverage
  Scenario: Invalid credentials are rejected by the login endpoint
    When I attempt login with deliberately invalid credentials
    Then the response status is 401

  @api @negative
  Scenario: An unknown client id returns an empty list rather than an error
    Given a client id that does not exist
    When I request that client's programs
    Then the response status is 200
    And the envelope holds no items

  @api @negative @endpoint-coverage
  Scenario: Target creation rejects an unknown client without writing data
    Given a client id that does not exist
    When I attempt to create a target for that unknown client
    Then the response status is a client error

  @api @negative @endpoint-coverage
  Scenario: Target deletion rejects an unknown client without deleting data
    Given a client id that does not exist
    When I attempt to delete a target for that unknown client
    Then the response status is a client error

  @ui @negative
  Scenario: An unknown client id in the URL falls back to the clients list
    Given a client id that does not exist
    When I open that client's record in the browser
    Then the clients list is shown

  @ui @negative
  Scenario: An unknown route falls back to the clients list
    When I open a route that does not exist
    Then the clients list is shown
