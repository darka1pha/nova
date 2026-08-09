import { createSchema } from "graphql-yoga";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const mockUsers: User[] = [
  { id: "1", name: "Alice Smith", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Jones", email: "bob@example.com", role: "developer" },
];

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type User {
      id: ID!
      name: String!
      email: String!
      role: String!
    }

    type Query {
      hello(name: String): String!
      users: [User!]!
      user(id: ID!): User
    }

    type Mutation {
      createUser(name: String!, email: String!, role: String): User!
    }
  `,
  resolvers: {
    Query: {
      hello: (_parent, { name }: { name?: string }) => {
        return `Hello ${name || "world"} from GraphQL Yoga!`;
      },
      users: () => mockUsers,
      user: (_parent, { id }: { id: string }) => {
        return mockUsers.find((u) => u.id === id) || null;
      },
    },
    Mutation: {
      createUser: (_parent, { name, email, role }: { name: string; email: string; role?: string }) => {
        const newUser: User = {
          id: String(mockUsers.length + 1),
          name,
          email,
          role: role || "member",
        };
        mockUsers.push(newUser);
        return newUser;
      },
    },
  },
});
