@write
Feature: Write flows
  Phase 2b. Mutating flows run only against TEST_CLIENT_ID (a dedicated client).
  Resources this suite creates are named ZZZ-SUITE-* and deleted in After.

  W0 recon (2026-08-27, re-checked 2026-09-02): POST /programs/{id}/targets with
  `{ description }` returns 201. DELETE requires If-Match (428 without it; 204 with
  `If-Match: *`). `program-details-add-target` does not open a form (DEF-6).
  Record-data opens `/sessions/new` (SES-1). POST .../automastery-evaluations returns
  405, so this suite cannot create a flagged evaluation to confirm or dismiss.
  Mastery confirm/dismiss must not be clicked for pre-existing evaluations.

  @api @write
  Scenario: Creating a target via the API lists it for the dedicated client
    When I create a uniquely named target on the dedicated client's program
    Then the response status is 201
    And the targets API lists that target

  @ui @write
  Scenario: Clicking add-target does not create a target without a form
    When I open the dedicated client's workspace
    And I select the resolved program in the rail
    And I note the program's target count
    And I click add-target
    Then no dialog is shown
    And the program's target count is unchanged

  # DEF-6. The control is present and clickable but does not open a create form.
  @ui @write @bug
  Scenario: Add target opens a form for a new target
    When I open the dedicated client's workspace
    And I select the resolved program in the rail
    And I click add-target
    Then a target form is shown

  @ui @write
  Scenario: Clicking record-data does not create a session
    When I open the dedicated client's workspace
    And I select the resolved program in the rail
    And I start watching for clinical writes
    And I click record-data
    Then no dialog is shown
    And no clinical write request is sent

  # Lands on /sessions/new (same as SES-1). Must not POST a session.
  @ui @write
  Scenario: Record data opens a collection form or session wizard
    When I open the dedicated client's workspace
    And I select the resolved program in the rail
    And I click record-data
    Then a data-collection form or the session wizard is shown

  # Blocked: POST automastery-evaluations is 405; no suite-owned flagged row.
  @ui @write @wip
  Scenario: Confirming mastery on a suite-created evaluation removes the pending row
    When I confirm mastery on a suite-created flagged evaluation
    Then that row is gone from the pending list

  @ui @write @wip
  Scenario: Dismissing a suite-created evaluation removes the pending row
    When I dismiss a suite-created flagged evaluation
    Then that row is gone from the pending list

  @ui @write
  Scenario: Saving a report on this device lists it in the same session
    When I open Analyze Data for the dedicated client
    And I save the current report as a unique name
    Then that report name is listed among saved reports
