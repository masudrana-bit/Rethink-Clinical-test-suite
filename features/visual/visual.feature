@visual
Feature: Visual regression
  Unit 12. Viewport screenshots of chrome and layout. Volatile data (client names,
  program titles, counts, charts, signed-in identity) is masked magenta so a
  shared-caseload write cannot fail the comparison (D9, D11).

  Baselines live in visual/baselines. Rewrite with UPDATE_VISUAL=1.
  Excluded from npm test; npm run test:visual.

  @ui @visual
  Scenario: The clients list chrome matches the baseline
    When I open the clients page
    Then the screenshot "clients-list" matches the baseline

  @ui @visual
  Scenario: The client workspace chrome matches the baseline
    When I open the resolved client's workspace
    And I select the resolved program in the rail
    Then the screenshot "client-workspace" matches the baseline

  @ui @visual
  Scenario: Analyze Data mastered report chrome matches the baseline
    When I open Analyze Data for the resolved client
    Then the screenshot "analyze-mastered" matches the baseline

  @ui @visual
  Scenario: Analyze Data custom graph chrome matches the baseline
    When I open Analyze Data for the resolved client
    And I switch to the "custom" mode
    Then the screenshot "analyze-custom" matches the baseline

  @ui @visual
  Scenario: Analyze Data bulk graph chrome matches the baseline
    When I open Analyze Data for the resolved client
    And I switch to the "bulk" mode
    Then the screenshot "analyze-bulk" matches the baseline
