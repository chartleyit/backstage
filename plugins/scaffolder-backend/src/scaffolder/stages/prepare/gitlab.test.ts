/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
jest.doMock('fs-extra', () => ({
  promises: {
    mkdtemp: jest.fn(dir => `${dir}-static`),
  },
}));

import { GitlabPreparer } from './gitlab';
import {
  TemplateEntityV1alpha1,
  LOCATION_ANNOTATION,
} from '@backstage/catalog-model';
import { getVoidLogger, Git } from '@backstage/backend-common';

const mockTemplate = (): TemplateEntityV1alpha1 => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Template',
  metadata: {
    annotations: {
      [LOCATION_ANNOTATION]:
        'url:https://gitlab.com/benjdlambert/backstage-graphql-template/-/blob/master/template.yaml',
    },
    name: 'graphql-starter',
    title: 'GraphQL Service',
    description:
      'A GraphQL starter template for backstage to get you up and running\nthe best practices with GraphQL\n',
    uid: '9cf16bad-16e0-4213-b314-c4eec773c50b',
    etag: 'ZTkxMjUxMjUtYWY3Yi00MjU2LWFkYWMtZTZjNjU5ZjJhOWM2',
    generation: 1,
  },
  spec: {
    type: 'website',
    templater: 'cookiecutter',
    path: './template',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      required: ['storePath', 'owner'],
      properties: {
        owner: {
          type: 'string',
          title: 'Owner',
          description: 'Who is going to own this component',
        },
        storePath: {
          type: 'string',
          title: 'Store path',
          description: 'GitHub store path in org/repo format',
        },
      },
    },
  },
});

describe('GitLabPreparer', () => {
  let mockEntity: TemplateEntityV1alpha1;
  const mockGitClient = {
    clone: jest.fn(),
  };
  const logger = getVoidLogger();

  jest.spyOn(Git, 'fromAuth').mockReturnValue(mockGitClient as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });
  const preparer = GitlabPreparer.fromConfig({
    host: 'gitlab.com',
    token: 'fake-token',
  });
  it(`calls the clone command with the correct arguments for a repository`, async () => {
    mockEntity = mockTemplate();

    await preparer.prepare(mockEntity, { logger: getVoidLogger() });

    expect(mockGitClient.clone).toHaveBeenCalledWith({
      url: 'https://gitlab.com/benjdlambert/backstage-graphql-template.git',
      dir: expect.any(String),
      ref: expect.any(String),
    });
  });

  it(`calls the clone command with the correct arguments if an access token is provided in integrations for a repository`, async () => {
    mockEntity = mockTemplate();

    await preparer.prepare(mockEntity, { logger });

    expect(Git.fromAuth).toHaveBeenCalledWith({
      logger,
      username: 'oauth2',
      password: 'fake-token',
    });
  });

  it(`calls the clone command with the correct arguments for a repository when no path is provided`, async () => {
    mockEntity = mockTemplate();
    delete mockEntity.spec.path;

    await preparer.prepare(mockEntity, { logger: getVoidLogger() });

    expect(mockGitClient.clone).toHaveBeenCalledWith({
      url: 'https://gitlab.com/benjdlambert/backstage-graphql-template.git',
      dir: expect.any(String),
      ref: expect.any(String),
    });
  });

  it(`return the temp directory with the path to the folder if it is specified`, async () => {
    mockEntity = mockTemplate();
    mockEntity.spec.path = './template/test/1/2/3';
    const response = await preparer.prepare(mockEntity, {
      logger: getVoidLogger(),
    });
    expect(response.split('\\').join('/')).toMatch(
      /\/template\/test\/1\/2\/3$/,
    );
  });

  it('return the working directory with the path to the folder if it is specified', async () => {
    mockEntity.spec.path = './template/test/1/2/3';
    const response = await preparer.prepare(mockEntity, {
      workingDirectory: '/workDir',
      logger: getVoidLogger(),
    });

    expect(response.split('\\').join('/')).toMatch(
      /\/workDir\/graphql-starter-static\/template\/test\/1\/2\/3$/,
    );
  });
});
