export interface paths {
  "/users": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              items: components["schemas"]["User"][];
              total: number;
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    User: {
      id: string;
      name: string;
      email: string;
    };
  };
}
