@REQ-CLIENT-001
Feature: Select a client and establish the active client context

  Clinical functionality is client-specific. A user opens the Client area and
  chooses a client, and that client becomes the context for the client-specific
  clinical information they go on to view. Choosing the wrong one risks acting on
  another person's clinical information, which is the risk these scenarios exist
  to guard against.

  Scope of this file. Only the two scenarios below are approved. Three further
  acceptance criteria of this requirement — that the selected client is the active
  context for Skills Programs, Behavior Support, and Analyze Data — are held
  pending a clinical decision recorded as GAP-010, and are deliberately absent
  rather than written weakly. Coverage is therefore partial by design; see
  aidlc-docs/design/REQ-CLIENT-001/coverage-matrix.md.

  Background:
    Given a user who can access the Clinical application

  @TC-CLIENT-001 @P1 @positive @AC-001
  Scenario: A user reaches the Client area
    Given at least one client is available
    When the user opens the Client area
    Then the Client area should be displayed
    And the client selector should offer at least one client

  @TC-CLIENT-002 @P1 @positive @AC-002
  Scenario: Selecting a client makes that client the active client
    Given two distinct clients are available, Client A and Client B
    And the Client area is displayed
    When the user selects Client B from the client selector
    Then the client selector should show Client B as the active client
    And the client selector should not show Client A as the active client
