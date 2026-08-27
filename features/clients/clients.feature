@clients
Feature: Clients list
  Unit 2. The clinician needs a trustworthy list of clients to work from, and
  needs to get from that list into a client's record.

  Per decision D2 nothing here asserts a fixed row count. The list is checked
  against the API response for the same request, so the pair has to agree.

  @api @smoke @clients
  Scenario: The clients endpoint returns a coherent paged envelope
    When I request the clients list from the API
    Then the response status is 200
    And the content type includes "x-api-version=1"
    And the envelope carries page, pageSize, totalCount, totalPages and items
    And the envelope's paging arithmetic is self-consistent

  @api @clients
  Scenario: Every client item carries the fields the app depends on
    When I request the clients list from the API
    Then every client item has a numeric id, a name, a client number and an active flag

  @ui @smoke @clients
  Scenario: The clients page lists exactly the clients the API returned
    When I open the clients page
    Then the listed clients match the API response exactly

  @ui @clients
  Scenario: Opening a client lands on their Skills Programs workspace
    When I open the clients page
    And I open the resolved client from the list
    Then the client workspace is displayed for that client
    And the client switcher names that client

  @ui @clients
  Scenario: Searching by name narrows the list to matching clients
    When I open the clients page
    And I search for the resolved client by part of their name
    Then every listed client's name contains the search text
    And the resolved client is listed

  @ui @clients
  Scenario: Searching by an unmatched name empties the list
    When I open the clients page
    And I search by name for "zzz-no-such-client"
    Then no clients are listed

  @ui @clients
  Scenario: Searching by client ID narrows the list to one client
    When I open the clients page
    And I search for the resolved client by their client number
    Then only the resolved client is listed

  @ui @clients
  Scenario: The client switcher moves to the chosen client's record
    When I open the clients page
    And I choose the resolved client from the client switcher
    Then the client workspace is displayed for that client

  @network @clients
  Scenario: The clients page fires the expected calls and no failures
    When I open the clients page while recording network traffic
    Then the runtime config, staff role and clients calls all succeeded
    And no recorded call failed

  @ui @clients
  Scenario: Each row's status agrees with the API active flag
    When I open the clients page
    Then every row's status matches the API active flag for that client
