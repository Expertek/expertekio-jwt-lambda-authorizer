# AWS API Gateway Lambda Authorizer for expertek.io JWTs

An AWS API Gateway [Lambda Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html) that authorizes API requests by requiring
that the [bearer token](https://tools.ietf.org/html/rfc6750) is a JWT that can be validated using the RS256 (asymmetric) algorithm with a public key that is obtained from the keys.expertek.io [JWKS](https://tools.ietf.org/html/rfc7517) endpoint.

## About

### Source

This project is based on [https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer](https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer), which is
itself a fork of [https://github.com/jghaines/lambda-auth0-authorizer](https://github.com/jghaines/lambda-auth0-authorizer).

The difference between the two projects is that the JWKS endpoint is set in `.env` to the keys.expertek.io endpoint, the full decoded claims and token are returned
in the response context, and the issuer and audience claims are not verified by default. The claims are intended to be used by the endpoint, and the token may be
used to further call back to expertek.io services.

Note the last point in the above: the _issuer and audience claims are not verified_. The audience claim is not used at present in expertek.io JWT's, and the issuer
will vary depending on the domain of the issuer instance. If you intend to limit access to a single issuer (say your own single-tenant instance of the software),
you can set that in `.env`.

### What is AWS API Gateway?

API Gateway is an AWS service that allows for the definition, configuration and deployment of REST API interfaces.
These interfaces can connect to a number of back-end systems.
One popular use case is to provide an interface to AWS Lambda functions to deliver a so-called 'serverless' architecture.

### What are "Lambda Authorizers"?

In February 2016 Amazon
[announced](https://aws.amazon.com/blogs/compute/introducing-custom-authorizers-in-amazon-api-gateway/)
a new feature for API Gateway -
[Custom Authorizers (now Lambda Authorizers)](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html). This allows a Lambda function to be invoked prior to an API Gateway execution to perform custom authorization of the request, rather than using AWS's built-in authorization. This code can then be isolated to a single centralized Lambda function rather than replicated across every backend Lambda function.

### What does this Custom Authorizer do?

This package gives you the code for a custom authorizer that will perform authorization on AWS API Gateway against expertek.io proxy router requests via the following:

* It confirms that a bearer token has been passed via the `Authorization` header
* It confirms that the token is a JWT that has been signed using the RS256 algorithm with a specific public key
* It obtains the public key by retrieving the keys.expertek.io JSON web key set
* It optionally ensures that the JWT matches a list of Issuers (`iss` claim), if specified

## Setup

Install Node Packages:

```bash
npm install
```

This is a prerequisite for deployment as AWS Lambda requires these files to be included in a bundle (a special ZIP file).

## Local testing

You can test the custom authorizer locally. You just need to obtain a valid JWT access token to perform the test. The easiest way to do this is to set up
a Lambda function that logs inbound headers, set up a proxy route in `expiora`, and call it from `expiort`. Then check the logged header output and use the
provided token. Note that proxy router tokens are short lived, so you'll need to grab it when you're ready to test.

With a valid token, now you just need to create a local `event.json` file that contains it. Start by copying the sample file:

```bash
cp event.json.sample event.json
```

Then replace the `ACCESS_TOKEN` text in that file with the JWT you obtained in the previous step.

Finally, perform the test:

```bash
npm test
```

This uses the [lambda-local](https://www.npmjs.com/package/lambda-local) package to test the authorizer with your token. A successful test run will look something like this:

```
> lambda-local --timeout 300 --lambdapath index.js --eventpath event.json

Logs
----
START RequestId: fe210d1c-12de-0bff-dd0a-c3ac3e959520
{ type: 'TOKEN',
    authorizationToken: 'Bearer eyJ0eXA...M2pdKi79742x4xtkLm6qNSdDYDEub37AI2h_86ifdIimY4dAOQ',
    methodArn: 'arn:aws:execute-api:us-east-1:1234567890:apiId/stage/method/resourcePath' }
END


Message
------
{
    "principalId": "user_id",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Stmt1459758003000",
                "Effect": "Allow",
                "Action": [
                    "execute-api:Invoke"
                ],
                "Resource": [
                    "arn:aws:execute-api:*"
                ]
            }
        ]
    }
}
```

An `Action` of `Allow` means the authorizer would have allowed the associated API call to the API Gateway if it contained your token.

## Deployment

Now we're ready to deploy the custom authorizer to an AWS API Gateway.

### Create the lambda bundle

First we need to create a bundle file that we can upload to AWS:

```bash
npm run bundle
```

This will generate a local `expertekio-jwt-authorizer.zip` bundle (ZIP file) containing all the source, configuration and node modules an AWS Lambda needs.

### Deploy the Lambda authorizer

For the latest instructions on deployment, refer to the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html).

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for more info.
