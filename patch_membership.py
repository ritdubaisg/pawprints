import io

# --- action: which stage lists the caller sits on ---
p = 'src/app/review-actions.ts'
s = io.open(p, encoding='utf-8').read()

anchor = '''export interface ReviewPool {'''
new_fn = '''/**
 * The stage keys the signed-in user is on the reviewer list for. Drives which
 * buttons the review page offers; the server re-checks on submit regardless.
 */
export async function getMyReviewStageKeys(): Promise<string[]> {
  const actor = await requireActor();

  const rows = await prisma.reviewStageMember.findMany({
    where: { userId: actor.id },
    select: { stageKey: true },
  });

  return rows.map((row) => row.stageKey);
}

export interface ReviewPool {'''
assert anchor in s
s = s.replace(anchor, new_fn, 1)
io.open(p, 'w', encoding='utf-8').write(s)

# --- action box: eligibility now comes from list membership ---
p = 'src/components/review/ReviewActionBox.tsx'
s = io.open(p, encoding='utf-8').read()

s = s.replace('''interface ReviewActionBoxProps {
  petition: Petition;
  permissions: number;
  isSuperAdmin: boolean;
  currentUserId: string | null;
}''', '''interface ReviewActionBoxProps {
  petition: Petition;
  permissions: number;
  isSuperAdmin: boolean;
  currentUserId: string | null;
  /** Stage keys whose reviewer list includes the signed-in user. */
  myStageKeys: string[];
}''')

s = s.replace('''  isSuperAdmin,
  currentUserId,
}: ReviewActionBoxProps) {''', '''  isSuperAdmin,
  currentUserId,
  myStageKeys,
}: ReviewActionBoxProps) {''')

old = '''  const isAuthor = petition.authorId === currentUserId;
  // Either the blanket permission or a standing assignment lets someone
  // review; authors are excluded from signing off on their own petition.
  const canReview =
    !isAuthor && (can(PERMISSIONS.APPROVE) || isAssignedHere);'''
new = '''  const isAuthor = petition.authorId === currentUserId;
  const onStageList =
    !!currentStage && myStageKeys.includes(currentStage.stage.key);
  // Being on the stage's reviewer list is what makes someone a reviewer. For
  // a stage that also requires assignment, the list is necessary but not
  // sufficient — this petition has to have named you. Authors never qualify.
  const canReview =
    !isAuthor &&
    !!currentStage &&
    (isSuperAdmin ||
      (onStageList &&
        (!currentStage.stage.requiresAssignment || isAssignedHere)));'''
assert old in s
s = s.replace(old, new)

old = '''                    {isAuthor
                      ? "You cannot review your own petition."
                      : canReview
                        ? "It publishes on its own once every stage passes."
                        : "You are not a reviewer for this stage."}'''
new = '''                    {isAuthor
                      ? "You cannot review your own petition."
                      : canReview
                        ? "It publishes on its own once every stage passes."
                        : currentStage?.needsAssignment
                          ? "Nobody is assigned to this stage yet."
                          : onStageList
                            ? "You have not been assigned to this petition."
                            : `You are not on the ${currentStage?.stage.name ?? "reviewer"} list.`}'''
assert old in s
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8').write(s)

# --- thread it through ---
p = 'src/components/review/PetitionDetail.tsx'
s = io.open(p, encoding='utf-8').read()
s = s.replace('''  isSuperAdmin: boolean;
  currentUserId: string | null;
}''', '''  isSuperAdmin: boolean;
  currentUserId: string | null;
  myStageKeys: string[];
}''')
s = s.replace('''  isSuperAdmin,
  currentUserId,
}: PetitionDetailProps) {''', '''  isSuperAdmin,
  currentUserId,
  myStageKeys,
}: PetitionDetailProps) {''')
s = s.replace('''              currentUserId={currentUserId}
            />''', '''              currentUserId={currentUserId}
              myStageKeys={myStageKeys}
            />''')
io.open(p, 'w', encoding='utf-8').write(s)

p = 'src/app/review/[id]/page.tsx'
s = io.open(p, encoding='utf-8').read()
s = s.replace('''import { PetitionDetail } from "@/components/review/PetitionDetail";''',
              '''import { getMyReviewStageKeys } from "@/app/review-actions";
import { PetitionDetail } from "@/components/review/PetitionDetail";''')
s = s.replace('''  const [petition, currentUserId] = await Promise.all([
    getReviewPetition(Number(id)),
    getCurrentUserId(),
  ]);''', '''  const [petition, currentUserId, myStageKeys] = await Promise.all([
    getReviewPetition(Number(id)),
    getCurrentUserId(),
    getMyReviewStageKeys(),
  ]);''')
s = s.replace('''      currentUserId={currentUserId}
    />''', '''      currentUserId={currentUserId}
      myStageKeys={myStageKeys}
    />''')
io.open(p, 'w', encoding='utf-8').write(s)

print("membership patched")
