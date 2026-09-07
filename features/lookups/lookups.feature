@lookups
Feature: Clinical lookups
  Read-only value catalogs from LookupController. Gateway path is
  /clinical/v1/lookup/{name} (no account segment). Each catalog is a bare
  array of {value, label} pairs.

  @api @lookups
  Scenario: Every lookup catalog returns value and label pairs
    When I request every Clinical lookup catalog
    Then every lookup catalog returns 200 with value and label pairs
