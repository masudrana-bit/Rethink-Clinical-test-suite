@a11y
Feature: Accessibility
  Unit 13. axe-core WCAG 2.A / 2.AA on the main Clinical pages.
  Decision D12: only critical-impact violations fail. Serious color-contrast
  (and one definition-list on Analyze Data) is recorded as AN-6, not a gate.

  @ui @a11y @signed-out
  Scenario: The sign-in page has no critical accessibility violations
    When I open the application root
    Then the sign-in page is shown
    And there are no critical accessibility violations

  @ui @a11y @clients
  Scenario: The clients list has no critical accessibility violations
    When I open the clients page
    Then there are no critical accessibility violations

  @ui @a11y @programs
  Scenario: The client workspace has no critical accessibility violations
    When I open the resolved client's workspace
    And I select the resolved program in the rail
    Then there are no critical accessibility violations

  @ui @a11y @analyze-data
  Scenario: Analyze Data has no critical accessibility violations
    When I open Analyze Data for the resolved client
    Then there are no critical accessibility violations

  @ui @a11y @behavior-support
  Scenario: Behavior Support has no critical accessibility violations
    When I open Behavior Support for the resolved client
    Then there are no critical accessibility violations
