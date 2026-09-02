@analyze-data
Feature: Analyze Data
  Unit 4. The mastery report: summary tiles, the skill-area chart, pending
  mastery determinations, and the controls that reshape them.

  Every count is asserted as a relationship from the same report, or as an upper
  bound against the live API. In-scope is not assumed to equal the raw target total.

  @ui @analyze-data
  Scenario: The three summary tiles render numbers
    When I open Analyze Data for the resolved client
    Then the mastered, in-scope and remaining tiles each show a number

  @ui @api @analyze-data
  Scenario: Mastered plus remaining equals in scope
    When I open Analyze Data for the resolved client
    Then mastered plus remaining equals in scope
    And the in-scope tile is not larger than the client's total target count

  @ui @api @analyze-data
  Scenario: The skill-area chart plots one category per domain
    When I open Analyze Data for the resolved client
    Then the chart renders with a value axis
    And the chart's categories are the client's distinct program domains
    And the mastered tile's skill-area count matches the chart's categories

  @ui @api @analyze-data
  Scenario: Pending mastery determinations are grouped by program
    When I open Analyze Data for the resolved client
    Then the review lists one row per flagged automastery evaluation
    And every row sits under a heading naming its own program

  @ui @analyze-data
  Scenario Outline: Each date range chip becomes the sole active selection
    When I open Analyze Data for the resolved client
    And I choose the "<window>" date range
    Then "<window>" is the only active date range

    Examples:
      | window   |
      | 2 weeks  |
      | 1 month  |
      | 3 months |
      | 6 months |
      | All      |

  @network @analyze-data
  Scenario: Loading the report fetches targets for every program
    When I record traffic while opening Analyze Data for the resolved client
    Then a targets request was made for every one of the client's programs
    And at least one automastery evaluation request was made

  # DEF-4. The report fans out to roughly two requests per program, and under that
  # concurrency the backend intermittently returns 500. Sequential requests to the
  # same endpoints always succeed.
  @network @analyze-data @bug
  Scenario: Every request the report makes succeeds
    When I record traffic while opening Analyze Data for the resolved client
    Then none of the report's per-program requests failed

  # DEF-1. The select updates its own label but the chart keeps its Domain
  # grouping. Excluded from the default run; expected to pass once fixed.
  @ui @api @analyze-data @bug
  Scenario: Changing the grouping regroups the chart
    When I open Analyze Data for the resolved client
    And I group the chart by "Category"
    Then the chart's categories cover the client's distinct program categories
    And the chart's categories differ from its domain grouping

  @ui @analyze-data
  Scenario: The grouping select offers domain, category and area
    When I open Analyze Data for the resolved client
    Then the grouping select offers "Domain", "Category" and "Area"

  @ui @analyze-data
  Scenario Outline: Mode tabs switch the report view
    When I open Analyze Data for the resolved client
    And I switch to the "<mode>" mode
    Then "<mode>" is the only active mode
    And the "<panel>" panel is shown

    Examples:
      | mode     | panel    |
      | custom   | custom   |
      | bulk     | bulk     |
      | mastered | mastered |

  @ui @api @analyze-data
  Scenario: Custom Graph offers every program as a comparison series
    When I open Analyze Data for the resolved client
    And I switch to the "custom" mode
    Then the series count equals the client's program count

  @ui @api @analyze-data
  Scenario: Bulk Graph offers every program as a comparison series
    When I open Analyze Data for the resolved client
    And I switch to the "bulk" mode
    Then the series count equals the client's program count

  @ui @analyze-data
  Scenario: Print requests a browser print of the current report
    When I open Analyze Data for the resolved client
    And I print the current report
    Then the browser print dialog is requested

  @ui @analyze-data
  Scenario: Summary tiles stay unresolved while targets are in flight
    Given the targets API is delayed
    When I open Analyze Data without waiting for tiles
    Then the in-scope tile is still unresolved
    When the targets API is allowed to complete
    Then the mastered, in-scope and remaining tiles each show a number

  @ui @analyze-data
  Scenario: A client with no programs shows a zeroed empty report
    Given the programs API returns an empty list
    When I open Analyze Data for the resolved client
    Then the mastered, in-scope and remaining tiles each show a number
    And every summary tile is zero
    And the mastered report empty state is shown

  @ui @analyze-data
  Scenario: The report scope select is present
    When I open Analyze Data for the resolved client
    Then the report scope select is displayed
