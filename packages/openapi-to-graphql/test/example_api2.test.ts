// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict'

/* globals beforeAll, test, expect */

import { graphql, parse, validate } from 'graphql'

import * as openAPIToGraphQL from '../lib/index'
import { startServer, stopServer } from './example_api2_server'

const oas = require('./fixtures/example_oas2.json')
const PORT = 3004
// update PORT for this test case:
oas.servers[0].variables.port.default = String(PORT)

let createdSchema

/**
 * Set up the schema first and run example API server
 */
beforeAll(() => {
  return Promise.all([
    openAPIToGraphQL
      .createGraphQlSchema(oas, { operationIdFieldNames: true })
      .then(({ schema, report }) => {
        createdSchema = schema
      }),
    startServer(PORT)
  ])
})

/**
 * Shut down API server
 */
afterAll(() => {
  return stopServer()
})

/**
 * There should be two operations
 * One will be given a field name from the operationId, i.e. user, and the other
 * one, because it does not have an operationId defined, will have an
 * autogenerated field name based on the path, i.e. getUser
 */
test('The option operationIdFieldNames should allow both operations to be present', () => {
  let oasGetCount = 0
  for (let path in oas.paths) {
    for (let method in oas.paths[path]) {
      if (method === 'get') oasGetCount++
    }
  }

  const gqlTypes = Object.keys(createdSchema._typeMap.Query.getFields()).length
  expect(gqlTypes).toEqual(oasGetCount)
})

test('Querying the two operations', () => {
  const query = `query {
    getUser {
      name
    }
    user {
      name
    }
  }`
  return graphql(createdSchema, query).then(result => {
    expect(result).toEqual({
      data: {
        getUser: {
          name: 'Arlene L McMahon'
        },
        user: {
          name: 'William B Ropp'
        }
      }
    })
  })
})
