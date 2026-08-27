@preflight
Feature: Test harness foundations
  Unit 0. Proves the suite can reach the environment, authenticate without
  credentials, resolve test data by capability, and isolate scenarios from
  each other. Every other unit depends on these holding.

  Scenario: Both origins answer before any test runs
    Then the application origin answered the preflight check
    And the API gateway origin answered the preflight check

  Scenario: A session is harvested from the preview sign-in
    Then a non-expired access token is available
    And the API accepts the harvested token

  Scenario: A test client is resolved by capability rather than by id
    When I resolve a client that has a program with targets
    Then the resolved client is active
    And the resolved program has at least one target

  Scenario: A seeded context is authenticated and free of prior state
    When I open the clients page
    Then the app shell shows a signed-in user
    And the browser holds no data-collection session state

  @signed-out
  Scenario: An unseeded context is not authenticated
    When I open the application root
    Then the sign-in page is shown

  Scenario: Credential fields are stripped before the browser sees them
    When I open the clients page and capture the staff-role response
    Then the captured response carries no credential fields
    And the app shell shows a signed-in user
