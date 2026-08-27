@behavior-support
Feature: Behavior Support
  Unit 5. The behavior plan rail and novel behaviors panel.

  The backing endpoint currently fails for every client (DEF-2), so this unit is
  careful to assert what should be true *either way* and to keep the defect itself
  in `@bug` scenarios rather than pinning today's broken behaviour as the contract.

  @ui @behavior-support
  Scenario: The page renders its plan rail and novel behaviors panel
    When I open Behavior Support for the resolved client
    Then the plan rail offers Current and Inactive tabs, each with a count
    And the novel behaviors panel reports a count

  # DEF-2. The endpoint returns 500 for every client.
  @api @behavior-support @bug
  Scenario: Behavior plans returns the client's plans
    When I request the resolved client's behavior plans
    Then the response status is 200

  # DEF-5. With the endpoint failing, the page shows "no behavior plans yet" and
  # "data is unavailable" at the same time. Whichever way the endpoint behaves, only
  # one of those two can be true, so this holds once either side is fixed.
  @ui @behavior-support @bug
  Scenario: The page does not claim there are no plans while data is unavailable
    When I open Behavior Support for the resolved client
    Then the empty plan message and the unavailable notice are not both shown
