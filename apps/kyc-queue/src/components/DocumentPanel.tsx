import { CheckCircle2, IdCard, XCircle } from "lucide-react";

interface Props {
  fullName: string;
  dateOfBirth: string;
  address: string;
  ssnLast4: string;
  idDocument: string;
}

/**
 * Mock document-verification panel: renders a simulated extracted-ID card
 * and diffs it against the fields the user submitted.
 */
export function DocumentPanel({
  fullName,
  dateOfBirth,
  address,
  ssnLast4,
  idDocument,
}: Props) {
  // Mock OCR extraction — in a real system this comes from a doc-verification vendor.
  const extracted = {
    fullName,
    dateOfBirth,
    // Simulated extraction quirk: street abbreviations expanded by OCR
    address: address.replace(/\bSt\b/, "Street").replace(/\bAve\b/, "Avenue"),
  };

  const rows: Array<{ label: string; submitted: string; onDoc: string }> = [
    { label: "Full name", submitted: fullName, onDoc: extracted.fullName },
    { label: "Date of birth", submitted: dateOfBirth, onDoc: extracted.dateOfBirth },
    { label: "Address", submitted: address, onDoc: extracted.address },
  ];

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Document Verification (Mock)
      </h2>

      <div className="mb-4 flex items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-indigo-100 text-xl font-bold text-indigo-700">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <IdCard className="h-4 w-4 text-slate-500" /> {idDocument}
          </div>
          <div className="text-xs text-slate-500">
            Photo ID on file · SSN •••-{ssnLast4}
          </div>
          <div className="mt-1 text-xs font-medium text-green-700">
            Facial match score: 94% (mock)
          </div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-2">Field</th>
            <th className="pb-2 pr-2">Submitted</th>
            <th className="pb-2 pr-2">On document</th>
            <th className="pb-2">Match</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const match =
              r.submitted.trim().toLowerCase() === r.onDoc.trim().toLowerCase();
            return (
              <tr key={r.label} className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-500">{r.label}</td>
                <td className="py-2 pr-2 font-medium">{r.submitted}</td>
                <td className="py-2 pr-2">{r.onDoc}</td>
                <td className="py-2">
                  {match ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-500" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
