# Cloud Watch Logs Clean Up

Running AWS Lambda, API Gateway and other services that automatically create Log Streams in CloudWatch logs
tend to fill upp the CloudWatch Logs quota. Especially test accounts quickly fill up with a lot of noise
and keeping this neat so that you find the logs you need is a bit of a pain.

This is a scheduled Lambda function that will clean up log groups from AWS CloudWatch Logs based on
configuration parameters.

Output logs include what groups were deleted and what groups were skipped and why they were skipped.

## Setup
* Run `make package`
* For each region you want to clean up logs in:
    * Upload `package.zip` to an S3 bucket in the same region as you will create the stack.
        * Ensure the S3 key is unique if you are updating an existing setup
    * Create a new stack using [the CloudFormation template](support/aws/cloudformation/cloud-watch-log-cleaner.template).
        * See configuration details below

## Configuration
All configuration is done via the CloudFormation template.

###InclusionPrefixes
Comma separated string of Log Group prefixes used to find Log Groups in CloudWatch.
Only prefixes supplied will be considered for deletion, however, if no
prefixes are provided, all Log Groups will be considered.

###ExclusionPatterns
Comma separated string of regular expressions. LogGroups that match any of these will be excluded.
If both include and exclude are given, exclude takes priority.
Each pattern is evaluated using new RegExp so do not include `/` at beginning and end of the patterns.
*Default:* No exclusion patterns

###MinAgeHours
Minimum age of the LogGroup in hours. Only older LogGroups will be deleted.

###ExcludeRetention
Set to true if you want LogGroups that have retention configured to be excluded.

###ExcludeSubscribed
Set to true if you want LogGroups that have any subscriptions configured.

###LastActivityHours
If the LogGroup fits all criteria for deletion it will only be deleted
if it has had no write activity for the given number of hours

#TODO

* Travis builds
* Coveralls
* Badges
