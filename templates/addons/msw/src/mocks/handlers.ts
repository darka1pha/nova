import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/users", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);

    return HttpResponse.json({
      items: [
        { id: "usr_1", name: "Ava Morgan", email: "ava@example.com" },
        { id: "usr_2", name: "Nima Rahimi", email: "nima@example.com" },
      ],
      page,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    });
  }),

  http.post("*/auth/login", async () =>
    HttpResponse.json({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    }),
  ),
];
