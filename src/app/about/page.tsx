import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-primary font-bold text-4xl mb-8">
          About PawPrints
        </h1>
        <div className="text-lg">
          <p>
            Inspired by RIT's original{" "}
            <a
              href="https://pawprints.rit.edu"
              target="_blank"
              className="text-primary hover:underline"
            >
              PawPrints
            </a>
            , the RIT Dubai Student Government (2025-2026) sought to improve
            engagement of RIT Dubai students through petitions. The site creates
            a place for the RIT Dubai community to converse on important issues.
          </p>
          <p className="mt-6">
            To remain transparent, this site is an open-source project on{" "}
            <a
              href="https://github.com/ritdubaisg/pawprints"
              target="_blank"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
            .
          </p>
          <Separator className="my-8" />
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-2">Have an idea</h3>

            <p>
              Search for petitions and if a petition similar to yours already
              exists, sign that petition. This will help raise support for your
              issue and help you better reach the minimum threshold of
              signatures for receiving an official Student Government response.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-2">Write your petition</h3>

            <p>
              Use proper spelling and grammar when writing your petition. This
              will help other users find the petition more easily. Be sure to
              review our Moderation Policy before posting.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-2">Share your petition</h3>

            <p>
              Use social media to spread awareness of your issue. A petition has
              one year to reach its threshold. If the threshold is not reached,
              then the petition is archived and available via the search.
            </p>
          </div>
          <Separator className="my-8" />
          <p className="mt-6">
            Use of this site falls under the{" "}
            <a
              href="https://www.rit.edu/policies/c082"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RIT Code of Conduct for Computer and Network Use
            </a>
            .
          </p>
          <br />
          <p>
            When using this service, you agree to sign petitions from only one
            RIT Computer Account. Should you have access to more than one
            account, you will only sign from your primary student, faculty, or
            staff account.
          </p>
          <br />
          <p className="font-bold">
            Please exercise good judgment when using this service.
          </p>
          <div className="mt-6">
            <p className="text-muted-foreground">
              Please remember, if this petition is about another person, staff,
              or faculty member, talk to Student Affairs or{" "}
              <a
                href="https://www.rit.edu/dubai/incident-report"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                report an incident
              </a>{" "}
              instead. Student Government reserves the right to edit or remove
              any petition at any time for violating the Code of Conduct. This
              includes, but is not limited to, creating an intimidating,
              hostile, or abusive environment for any member of the RIT
              community, or posting of any obscene, defamatory, threatening, or
              otherwise harassing petitions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
