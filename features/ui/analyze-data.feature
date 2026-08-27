@ui @analyze-data
Feature: Analyze Data page
  A clinician reviews mastered-target progress for a client

  Background:
    Given a clinician is logged in
    And an active client with skills programs

  @ui @analyze-data
  Scenario: Summary cards render
    When they open the client's "Analyze Data" page
    Then the "Targets in scope" card is shown
    And the "Targets mastered" card is shown
    And the "Remaining" card is shown

  @ui @analyze-data
  Scenario: Mastered and remaining reconcile with in-scope
    When they open the client's "Analyze Data" page
    Then "Targets mastered" plus "Remaining" equals "Targets in scope"

  @ui @analyze-data
  Scenario: Mastered-by-skill-area chart is displayed
    When they open the client's "Analyze Data" page
    Then a "Mastered targets by skill area" chart is visible

  @ui @analyze-data
  Scenario: Date range chips are available
    When they open the client's "Analyze Data" page
    Then the date range options "2 weeks", "1 month", "3 months", "6 months", "All" are visible

  @network @analyze-data
  Scenario: Expected API calls fire on load
    When they open the client's "Analyze Data" page
    Then a request to "/clinical/v1/clients/:id/programs" completed with 200
    And a request to a "targets" endpoint completed with 200
    And a request to an "automastery-evaluations" endpoint completed with 200
