import { Outlet, createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";
import { JobsPage } from "./pages/JobsPage";
import { ExecutionsPage } from "./pages/ExecutionsPage";

export interface OpenSearch {
  open?: string;
}

function validateOpenSearch(search: Record<string, unknown>): OpenSearch {
  return { open: typeof search.open === "string" ? search.open : undefined };
}

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/jobs" });
  },
});

export const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jobs",
  validateSearch: validateOpenSearch,
  component: JobsPage,
});

export const executionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/executions",
  validateSearch: validateOpenSearch,
  component: ExecutionsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, jobsRoute, executionsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
