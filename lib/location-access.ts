export type LocationIssue = "blocked" | "unavailable" | "timeout" | "unsupported" | "unknown";

type Handlers = {
  onStart: () => void;
  onSuccess: (position: GeolocationPosition) => void;
  onError: (issue: LocationIssue) => void;
  onFinish: () => void;
};

function issueForCode(code: number): LocationIssue {
  return code === 1 ? "blocked" : code === 2 ? "unavailable" : code === 3 ? "timeout" : "unknown";
}

// One request per click, with cancellation for callbacks arriving after unmount.
export function createLocationRequester(geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined, handlers: Handlers) {
  let pending = false;
  let generation = 0;
  return {
    request() {
      if (pending) return;
      pending = true;
      const requestId = ++generation;
      handlers.onStart();
      const finish = (result: { position: GeolocationPosition } | { issue: LocationIssue }) => {
        if (!pending || requestId !== generation) return;
        pending = false;
        if ("position" in result) handlers.onSuccess(result.position);
        else handlers.onError(result.issue);
        handlers.onFinish();
      };
      if (!geolocation) { finish({ issue: "unsupported" }); return; }
      try {
        geolocation.getCurrentPosition(
          (position) => finish({ position }),
          (error) => finish({ issue: issueForCode(error.code) }),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
        );
      } catch (error) {
        finish({ issue: error instanceof Error && error.name === "SecurityError" ? "blocked" : "unknown" });
      }
    },
    cancel() {
      pending = false;
      generation++;
    },
  };
}
