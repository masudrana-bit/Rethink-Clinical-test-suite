@programs
Feature: Client programs
  Unit 3. A client's skills programs, the endpoints behind them, and the rail
  the clinician uses to move between them.

  The five per-program endpoints do **not** share one response shape, so each is
  asserted against the shape it actually returns rather than a generic envelope.

  @api @programs
  Scenario: The programs endpoint describes a client's programs
    When I request the resolved client's programs
    Then the response status is 200
    And the envelope's paging arithmetic is self-consistent
    And every program has an id, a title and an active flag

  @api @programs
  Scenario: The program library returns the template catalogue
    When I request the program library
    Then the response status is 200
    And the envelope's paging arithmetic is self-consistent
    And every library entry has an id and a title

  @api @programs
  Scenario Outline: Paged per-program endpoints return a valid envelope
    When I request "<endpoint>" for the resolved program
    Then the response status is 200
    And the envelope's paging arithmetic is self-consistent

    Examples:
      | endpoint   |
      | targets    |
      | objectives |

  @api @programs
  Scenario: Mastery criteria returns a programme-scoped criteria document
    When I request "mastery-criteria" for the resolved program
    Then the response status is 200
    And the document names the resolved program and carries a phases list

  @api @programs
  Scenario: Target groups returns a bare list
    When I request "target-groups" for the resolved program
    Then the response status is 200
    And the response body is an array

  @api @programs
  Scenario: Data collection describes how the programme is measured
    When I request "data-collection" for the resolved program
    Then the response status is 200
    And the document names the resolved program and carries a collection method

  @api @programs
  Scenario: Flagged automastery evaluations return only flagged items
    When I request flagged automastery evaluations for a program that has them
    Then the response status is 200
    And every evaluation is flagged and references a target

  @ui @programs
  Scenario: The rail's Current tab lists exactly the active programs
    When I open the resolved client's workspace
    Then the rail lists exactly the client's active programs

  @ui @programs
  Scenario: Current and Inactive tabs partition the client's programs
    When I open the resolved client's workspace
    Then the Current and Inactive tabs together list every program exactly once

  @ui @programs
  Scenario: Selecting a program reveals its details
    When I open the resolved client's workspace
    And I select the resolved program in the rail
    Then the program's targets, goals and settings panels are shown

  @ui @programs
  Scenario: The domain filter narrows the rail to one domain
    When I open the resolved client's workspace
    And I filter the rail by the most common domain on this tab
    Then the rail lists exactly the programs in that domain
    When I clear the domain filter
    Then the rail lists exactly the client's active programs
