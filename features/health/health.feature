@health
Feature: Clinical health checks through the gateway
  Gateway PR 49218. Health used to fall through to the authenticated /clinical/api
  catch-all: no token returned 401 with an empty body, and a token returned 404.
  These routes skip Bearer and the /api rewrite. They still go through
  ApplicationKeyHandler.

  @api @health
  Scenario: The health check is reachable with the application key and no token
    Given I have no auth token
    When I GET "/clinical/healthcheck" with the application key
    Then the response status is 200

  @api @health
  Scenario: The health report is reachable with the application key and no token
    Given I have no auth token
    When I GET "/clinical/healthcheck/report" with the application key
    Then the response status is 200

  @api @health
  Scenario: An authenticated health check is not rewritten under /api
    Given I am logged in via the auth API
    When I GET "/clinical/healthcheck" with the application key
    Then the response status is 200
    And the response status is not 404

  @api @negative @health
  Scenario: A health check without an application key is still reachable
    Given I have no auth token
    When I GET "/clinical/healthcheck"
    Then the response status is 200
