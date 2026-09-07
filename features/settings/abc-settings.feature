@settings
Feature: ABC Settings
  WebApp PR 69. Clinical settings exposes the account's ABC response options
  as one library and renders them as sectioned parent/subtype trees.

  @api @settings
  Scenario: ABC options expose rows the settings page can render
    When I request the ABC options library
    Then the response status is 200
    And the content type includes "x-api-version=1"
    And the envelope's paging arithmetic is self-consistent
    And every ABC option has an id, label, recognized kind, order and settings columns

  @ui @settings
  Scenario: ABC Settings loads its sectioned option library
    When I open ABC Settings
    Then the ABC Settings page and section switcher are displayed
    And the ABC options request succeeded

  @ui @settings
  Scenario: Program Library administration loads the organization catalog
    When I open Program Library administration
    Then the Program Library administration page is displayed
    And the program library request succeeded

  @api @settings
  Scenario: Data-collection scales return named account catalogs
    When I request the data-collection scales library
    Then the response status is 200
    And the content type includes "x-api-version=1"
    And the envelope's paging arithmetic is self-consistent
    And every data-collection scale has an id, name, scale type and items
