/**
 * Fetches the signed-in Google account's birthday, if the user has shared it
 * (requires the "user.birthday.read" scope and the user's People API privacy
 * setting to allow it — many users keep this private, in which case Google
 * returns no birthday data at all, which is expected and not an error).
 *
 * Returns an ISO date string "YYYY-MM-DD", or null if unavailable.
 */
export async function fetchGoogleBirthday(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=birthdays",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const birthdays = data?.birthdays as Array<{ date?: { year?: number; month?: number; day?: number } }> | undefined;
    if (!birthdays || birthdays.length === 0) return null;

    // Prefer an entry that has a full year (some accounts only expose month/day).
    const withYear = birthdays.find((b) => b.date?.year) || birthdays[0];
    const { year, month, day } = withYear.date || {};
    if (!month || !day) return null;

    const y = year || new Date().getFullYear(); // fallback if the user hid the year
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  } catch (err) {
    console.error("Error obteniendo fecha de nacimiento de Google:", err);
    return null;
  }
}
