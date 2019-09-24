import React, {useContext} from 'react';

import ApolloClient, {ApolloClientOptions} from 'apollo-client';
import {Operation} from 'apollo-link';
import {useSerialized} from '@shopify/react-html';
import {
  ApolloProvider,
  createSsrExtractableLink,
  createOperationDetailsLink,
  GraphQLOperationDetails,
  GraphQLOperationsContext,
} from '@shopify/react-graphql';
import {useLazyRef} from '@shopify/react-hooks';
import {createApolloBridge} from '@shopify/react-effect-apollo';

export type GraphQLClientOptions = ApolloClientOptions<any>;

interface Props {
  children?: React.ReactNode;
  createClientOptions(): ApolloClientOptions<any>;
  additionalGraphQLFields?: (operation: Operation) => {};
}

export function GraphQLUniversalProvider({
  children,
  createClientOptions,
  additionalGraphQLFields,
}: Props) {
  const [initialData, Serialize] = useSerialized<object | undefined>('apollo');
  const graphQLOperations: GraphQLOperationDetails[] = useContext(
    GraphQLOperationsContext,
  );

  const [client, link] = useLazyRef<
    [
      import('apollo-client').ApolloClient<any>,
      ReturnType<typeof createSsrExtractableLink>
    ]
  >(() => {
    const clientOptions = createClientOptions();
    const link = createSsrExtractableLink();

    if (clientOptions.link) {
      const fields = additionalGraphQLFields ? {additionalGraphQLFields} : {};
      clientOptions.link = link
        .concat(
          createOperationDetailsLink({
            onOperation: operation => graphQLOperations.push(operation),
            ...fields,
          }),
        )
        .concat(clientOptions.link);
    }

    const apolloClient = new ApolloClient(clientOptions);

    if (initialData) {
      apolloClient.cache = apolloClient.cache.restore(initialData);
    }

    return [apolloClient, link];
  }).current;

  const ApolloBridge = createApolloBridge();

  return (
    <ApolloBridge>
      <ApolloProvider client={client}>{children}</ApolloProvider>
      <Serialize data={() => link.resolveAll(() => client.extract())} />
    </ApolloBridge>
  );
}
