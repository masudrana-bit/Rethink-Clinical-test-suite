@negative @behavior-support
Feature: Behavior plans endpoint (known defect)
  The crawl captured this endpoint returning 500 across all clients.
  This scenario documents the current behaviour so a regression is visible
  the moment it is fixed or changes.

  Background:
    Given I am logged in via the auth API
    And a known active client id

  @api @bug @behavior-support
  Scenario: Behavior plans currently returns a server error
    When I GET the behaviorplans endpoint for the client
    Then the response status is 500
    # When this is fixed, change the expected status and remove @bug.
