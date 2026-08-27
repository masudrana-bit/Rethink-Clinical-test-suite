@clients
Feature: Clients list
  The clinician needs a paged, valid list of clients to work from

  Background:
    Given I am logged in via the auth API

  @api @smoke @clients
  Scenario: Clients endpoint returns a valid paged envelope
    When I GET "/clinical/v1/clients?page=1&pageSize=200"
    Then the response status is 200
    And the content type includes "x-api-version=1"
    And the body has keys "page", "pageSize", "totalCount", "totalPages", "items"

  @api @clients
  Scenario: Each client item exposes the required fields
    When I GET "/clinical/v1/clients?page=1&pageSize=200"
    Then every item has "id", "firstName", "lastName", "isActive"
    And every "id" is a number
    And every "isActive" is a boolean

  @negative @api @clients
  Scenario: Unauthenticated clients request is rejected
    Given I have no auth token
    When I GET "/clinical/v1/clients?page=1&pageSize=200"
    Then the response status is not 200
