@sessions
Feature: New session wizard
  Sustain pass 2026-09-02: `program-details-record-data` now leaves Skills Programs
  for `/sessions/new`. Completing Confirm would write session data. Default tests
  land on participants, may open Programs, and never click Confirm.

  @ui @sessions
  Scenario: Record-data opens the new-session wizard without posting
    When I open the resolved client's workspace
    And I select the resolved program in the rail
    And I start watching for clinical writes
    And I click record-data
    Then the new session wizard is shown
    And no clinical write request is sent

  @ui @sessions
  Scenario: The wizard advances to Programs without posting a session
    When I open the resolved client's workspace
    And I select the resolved program in the rail
    And I start watching for clinical writes
    And I click record-data
    And I advance the new-session wizard to Programs
    Then the Programs step is shown
    And no clinical write request is sent
