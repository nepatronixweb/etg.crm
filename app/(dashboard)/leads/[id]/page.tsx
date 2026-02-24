"use client";
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, UserPlus, MapPin, Phone, Mail, Calendar, Plus, X, GraduationCap, Globe, Trash2, ChevronDown } from "lucide-react";
import { formatDate, formatDateTime, getStatusColor, getRoleLabel, COUNTRIES } from "@/lib/utils";
import { ILead } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CountryEntry {
  country: string;
  universityName: string;
}

const UNIVERSITIES_BY_COUNTRY: Record<string, string[]> = {
  "Australia": ["University of Melbourne","Australian National University","University of Sydney","University of Queensland","Monash University","University of New South Wales","University of Adelaide","University of Western Australia","University of Technology Sydney","RMIT University","Deakin University","La Trobe University","Macquarie University","Griffith University","Queensland University of Technology","Curtin University","Bond University","Charles Darwin University","Federation University"],
  "Canada": ["University of Toronto","University of British Columbia","McGill University","University of Alberta","McMaster University","University of Ottawa","University of Waterloo","Western University","Queen's University","Dalhousie University","University of Calgary","Simon Fraser University","York University","Concordia University","University of Manitoba","University of Saskatchewan","Carleton University","Ryerson University","Brock University","University of Victoria"],
  "United Kingdom": ["University of Oxford","University of Cambridge","Imperial College London","University College London","London School of Economics","University of Edinburgh","University of Manchester","King's College London","University of Bristol","University of Warwick","University of Glasgow","University of Birmingham","University of Leeds","University of Sheffield","University of Nottingham","University of Liverpool","University of Southampton","Newcastle University","Durham University","University of Bath","Cardiff University","Heriot-Watt University","University of Exeter"],
  "United States": ["Massachusetts Institute of Technology","Stanford University","Harvard University","California Institute of Technology","University of Chicago","Princeton University","Columbia University","Yale University","University of Pennsylvania","Cornell University","Johns Hopkins University","Duke University","Northwestern University","University of California Berkeley","University of California Los Angeles","Carnegie Mellon University","New York University","University of Michigan","University of Texas at Austin","University of Washington","Purdue University","Boston University"],
  "New Zealand": ["University of Auckland","University of Otago","Victoria University of Wellington","University of Canterbury","Massey University","Lincoln University","Auckland University of Technology","Waikato University"],
  "Germany": ["Technical University of Munich","Ludwig Maximilian University of Munich","Heidelberg University","Humboldt University of Berlin","Free University of Berlin","RWTH Aachen University","University of Hamburg","Goethe University Frankfurt","University of Stuttgart","University of Göttingen","University of Cologne","University of Bonn","Karlsruhe Institute of Technology"],
  "France": ["Sorbonne University","École Polytechnique","Sciences Po","HEC Paris","INSEAD","University of Paris","École Normale Supérieure","Grenoble INP","University of Bordeaux","University of Lyon","University of Strasbourg","University of Montpellier"],
  "Japan": ["University of Tokyo","Kyoto University","Osaka University","Tohoku University","Nagoya University","Tokyo Institute of Technology","Waseda University","Keio University","Hokkaido University","Kyushu University","Kobe University","Hiroshima University"],
  "South Korea": ["Seoul National University","Korea Advanced Institute of Science & Technology","Yonsei University","Korea University","Sungkyunkwan University","Hanyang University","Sogang University","Ewha Womans University","Pohang University of Science and Technology","Ulsan National Institute of Science and Technology"],
  "Netherlands": ["University of Amsterdam","Delft University of Technology","Leiden University","Utrecht University","Erasmus University Rotterdam","University of Groningen","Eindhoven University of Technology","Maastricht University","Tilburg University","Wageningen University"],
  "Sweden": ["Karolinska Institute","Royal Institute of Technology","Lund University","Uppsala University","Stockholm University","Chalmers University of Technology","University of Gothenburg","Linköping University","Umeå University"],
  "Denmark": ["University of Copenhagen","Technical University of Denmark","Aarhus University","Copenhagen Business School","Aalborg University","University of Southern Denmark"],
  "Finland": ["University of Helsinki","Aalto University","University of Turku","University of Tampere","University of Oulu","University of Jyväskylä"],
  "Norway": ["University of Oslo","Norwegian University of Science and Technology","University of Bergen","University of Tromsø","Norwegian School of Economics"],
  "Switzerland": ["ETH Zurich","EPFL","University of Zurich","University of Geneva","University of Basel","University of Bern","University of Lausanne","University of St. Gallen"],
  "Austria": ["University of Vienna","Vienna University of Technology","Graz University of Technology","University of Graz","Johannes Kepler University Linz","University of Innsbruck","Vienna University of Economics and Business"],
  "Ireland": ["Trinity College Dublin","University College Dublin","University College Cork","National University of Ireland Galway","Dublin City University","University of Limerick","Maynooth University"],
  "Singapore": ["National University of Singapore","Nanyang Technological University","Singapore Management University","Singapore University of Technology and Design","Singapore Institute of Technology"],
  "Malaysia": ["University of Malaya","Universiti Putra Malaysia","Universiti Kebangsaan Malaysia","Universiti Teknologi Malaysia","Universiti Sains Malaysia","Taylor's University","Monash University Malaysia","Sunway University","INTI International University"],
  "Dubai (UAE)": ["American University in Dubai","University of Dubai","Heriot-Watt University Dubai","Middlesex University Dubai","University of Birmingham Dubai","Rochester Institute of Technology Dubai","Murdoch University Dubai","Canadian University Dubai"],
  "Cyprus": ["University of Cyprus","Cyprus International University","European University Cyprus","Frederick University","University of Nicosia"],
  "Malta": ["University of Malta","Malta College of Arts, Science and Technology"],
  "Hungary": ["Budapest University of Technology and Economics","Eötvös Loránd University","University of Debrecen","University of Pécs","Corvinus University of Budapest","Semmelweis University"],
  "Poland": ["University of Warsaw","Jagiellonian University","Warsaw University of Technology","AGH University of Science and Technology","Adam Mickiewicz University","Wrocław University of Technology"],
  "Czech Republic": ["Charles University","Czech Technical University in Prague","Brno University of Technology","Masaryk University","University of Economics Prague","Palacký University Olomouc"],
};

function getUniversities(country: string): string[] {
  return UNIVERSITIES_BY_COUNTRY[country] || [];
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [lead, setLead] = useState<ILead | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [converting, setConverting] = useState(false);

  // ── Convert modal state ──
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [countryEntries, setCountryEntries] = useState<CountryEntry[]>([
    { country: "", universityName: "" },
  ]);
  const [countrySearch, setCountrySearch] = useState<string[]>([""]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [uniSearch, setUniSearch] = useState<string[]>([""]);
  const [uniOpen, setUniOpen] = useState<number | null>(null);

  // ── Lead countries (editable inline) ──
  const [leadCountries, setLeadCountries] = useState<CountryEntry[]>([]);
  const [lcSearch, setLcSearch] = useState<string[]>([]);
  const [lcOpenDropdown, setLcOpenDropdown] = useState<number | null>(null);
  const [lcUniSearch, setLcUniSearch] = useState<string[]>([]);
  const [lcUniOpen, setLcUniOpen] = useState<number | null>(null);
  const [savingCountries, setSavingCountries] = useState(false);
  const [countriesSaved, setCountriesSaved] = useState(false);

  const fetchLead = async () => {
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    setLead(data);
    // Populate lead countries from saved data
    if (Array.isArray(data.interestedCountries) && data.interestedCountries.length > 0) {
      setLeadCountries(data.interestedCountries.map((e: CountryEntry) => ({ country: e.country, universityName: e.universityName || "" })));
      setLcSearch(data.interestedCountries.map(() => ""));
      setLcUniSearch(data.interestedCountries.map(() => ""));
    } else if (data.interestedCountry) {
      setLeadCountries([{ country: data.interestedCountry, universityName: "" }]);
      setLcSearch([""]);
      setLcUniSearch([""]);
    } else {
      setLeadCountries([{ country: "", universityName: "" }]);
      setLcSearch([""]);
      setLcUniSearch([""]);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLead(); }, [id]);

  // Pre-fill convert modal from lead's saved countries
  useEffect(() => {
    if (showConvertModal) {
      const base = leadCountries.filter((e) => e.country.trim());
      if (base.length > 0) {
        setCountryEntries(base.map((e) => ({ country: e.country, universityName: e.universityName })));
        setCountrySearch(base.map(() => ""));
      } else if (lead?.interestedCountry) {
        setCountryEntries([{ country: lead.interestedCountry, universityName: "" }]);
        setCountrySearch([""]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConvertModal]);

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch(`/api/leads/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: note }) });
    setNote("");
    setAddingNote(false);
    fetchLead();
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchLead();
  };

  // ── Lead countries save ──
  const saveLeadCountries = async () => {
    const valid = leadCountries.filter((e) => e.country.trim());
    setSavingCountries(true);
    await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestedCountries: valid }),
    });
    setSavingCountries(false);
    setCountriesSaved(true);
    setTimeout(() => setCountriesSaved(false), 2500);
  };

  // ── Lead country list helpers ──
  const addLcEntry = () => {
    setLeadCountries((p) => [...p, { country: "", universityName: "" }]);
    setLcSearch((p) => [...p, ""]);
    setLcUniSearch((p) => [...p, ""]);
  };
  const removeLcEntry = (i: number) => {
    setLeadCountries((p) => p.filter((_, idx) => idx !== i));
    setLcSearch((p) => p.filter((_, idx) => idx !== i));
    setLcUniSearch((p) => p.filter((_, idx) => idx !== i));
  };
  const setLcCountry = (i: number, country: string) => {
    setLeadCountries((p) => p.map((e, idx) => idx === i ? { ...e, country, universityName: "" } : e));
    setLcSearch((p) => p.map((v, idx) => idx === i ? "" : v));
    setLcUniSearch((p) => p.map((v, idx) => idx === i ? "" : v));
    setLcOpenDropdown(null);
  };
  const setLcUniversity = (i: number, universityName: string) => {
    setLeadCountries((p) => p.map((e, idx) => idx === i ? { ...e, universityName } : e));
    setLcUniOpen(null);
  };

  const convertToStudent = async () => {
    setConverting(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/students/${data.student._id}`);
    }
    setConverting(false);
  };

  // ── Country entry helpers ──
  const addCountryEntry = () => {
    setCountryEntries((prev) => [...prev, { country: "", universityName: "" }]);
    setCountrySearch((prev) => [...prev, ""]);
    setUniSearch((prev) => [...prev, ""]);
  };

  const removeCountryEntry = (i: number) => {
    setCountryEntries((prev) => prev.filter((_, idx) => idx !== i));
    setCountrySearch((prev) => prev.filter((_, idx) => idx !== i));
    setUniSearch((prev) => prev.filter((_, idx) => idx !== i));
  };

  const setEntryCountry = (i: number, country: string) => {
    setCountryEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, country, universityName: "" } : e));
    setCountrySearch((prev) => prev.map((v, idx) => idx === i ? "" : v));
    setUniSearch((prev) => prev.map((v, idx) => idx === i ? "" : v));
    setOpenDropdown(null);
  };

  const setEntryUniversity = (i: number, universityName: string) => {
    setCountryEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, universityName } : e));
    setUniOpen(null);
  };

  const setSearch = (i: number, val: string) => {
    setCountrySearch((prev) => prev.map((v, idx) => idx === i ? val : v));
    setOpenDropdown(i);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!lead) return <div className="text-center py-20 text-gray-400">Lead not found</div>;

  const assignedTo = lead.assignedTo as unknown as { name: string; email: string };
  const branch = lead.branch as unknown as { name: string; location: string };

  const canNote = ["super_admin", "counsellor", "telecaller"].includes(session?.user?.role || "");
  const canConvert = ["super_admin", "counsellor"].includes(session?.user?.role || "") && !lead.convertedToStudent;
  const canUpdateStatus = ["super_admin", "telecaller", "counsellor"].includes(session?.user?.role || "");
  const canEdit = ["super_admin", "counsellor", "telecaller", "front_desk"].includes(session?.user?.role || "");

  const validEntries = countryEntries.filter((e) => e.country.trim());
  const usedCountries = new Set(countryEntries.map((e) => e.country));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-gray-500 text-sm">Lead Details</p>
        </div>
        {lead.convertedToStudent && (
          <span className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Converted to Student</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Phone, label: "Phone", value: lead.phone },
                { icon: Mail, label: "Email", value: lead.email },
                { icon: Calendar, label: "Date of Birth", value: lead.dateOfBirth },
                { icon: MapPin, label: "Branch", value: branch?.name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg"><Icon size={16} className="text-gray-500" /></div>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Lead Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div><span className="text-gray-400">Source</span><p className="font-medium capitalize mt-1">{lead.source?.replace("_", " ")}</p></div>
              <div><span className="text-gray-400">Service</span><p className="font-medium mt-1">{lead.interestedService}</p></div>
              <div><span className="text-gray-400">Assigned To</span><p className="font-medium mt-1">{assignedTo?.name || "Unassigned"}</p></div>
              <div><span className="text-gray-400">Created</span><p className="font-medium mt-1">{formatDate(lead.createdAt)}</p></div>
              <div><span className="text-gray-400">Reminders Sent</span><p className="font-medium mt-1">{lead.remindersCount}/2</p></div>
            </div>

            {/* Countries & Universities */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe size={12} /> Interested Countries &amp; Universities
                </p>
                {leadCountries.filter((e) => e.country).length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    {leadCountries.filter((e) => e.country).length} countr{leadCountries.filter((e) => e.country).length > 1 ? "ies" : "y"}
                  </span>
                )}
              </div>

              <div className="space-y-2" onClick={() => { setLcOpenDropdown(null); setLcUniOpen(null); }}>
                {leadCountries.map((entry, i) => {
                  const usedLc = new Set(leadCountries.map((e) => e.country));
                  const unis = getUniversities(entry.country);
                  const filteredUnis = unis.filter((u) => u.toLowerCase().includes((lcUniSearch[i] ?? "").toLowerCase()));
                  return (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                          <Globe size={10} className="text-gray-400" /> Destination {i + 1}
                        </span>
                        {canEdit && leadCountries.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeLcEntry(i); }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* Country dropdown */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`flex items-center justify-between w-full px-3 py-2 bg-white border rounded-lg text-sm ${
                            canEdit ? "cursor-pointer" : "cursor-default"
                          } transition-colors ${
                            lcOpenDropdown === i ? "border-gray-500 ring-1 ring-gray-400" : "border-gray-200 hover:border-gray-400"
                          }`}
                          onClick={() => { if (canEdit) { setLcUniOpen(null); setLcOpenDropdown(lcOpenDropdown === i ? null : i); } }}
                        >
                          {entry.country ? (
                            <span className="text-gray-900 font-medium flex items-center gap-1.5"><Globe size={12} className="text-blue-400" />{entry.country}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">Select a country…</span>
                          )}
                          {canEdit && <ChevronDown size={13} className={`text-gray-400 transition-transform ${lcOpenDropdown === i ? "rotate-180" : ""}`} />}
                        </div>
                        {canEdit && lcOpenDropdown === i && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <input
                                autoFocus
                                value={lcSearch[i] ?? ""}
                                onChange={(e) => { setLcSearch((p) => p.map((v, idx) => idx === i ? e.target.value : v)); }}
                                placeholder="Search countries…"
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <ul className="max-h-40 overflow-y-auto">
                              {COUNTRIES.filter((c) => c.toLowerCase().includes((lcSearch[i] ?? "").toLowerCase())).map((c) => {
                                const alreadyUsed = usedLc.has(c) && entry.country !== c;
                                return (
                                  <li key={c}>
                                    <button
                                      type="button"
                                      disabled={alreadyUsed}
                                      onClick={(e) => { e.stopPropagation(); if (!alreadyUsed) setLcCountry(i, c); }}
                                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                        entry.country === c ? "bg-blue-50 text-blue-700 font-medium" :
                                        alreadyUsed ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      {c}
                                      {entry.country === c && <span className="text-blue-500 text-xs">✓</span>}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* University dropdown */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`flex items-center justify-between w-full px-3 py-2 bg-white border rounded-lg text-sm transition-colors ${
                            !entry.country || !canEdit ? "opacity-60 cursor-not-allowed bg-gray-50" :
                            lcUniOpen === i ? "border-gray-500 ring-1 ring-gray-400 cursor-pointer" : "border-gray-200 hover:border-gray-400 cursor-pointer"
                          }`}
                          onClick={() => { if (entry.country && canEdit) { setLcOpenDropdown(null); setLcUniOpen(lcUniOpen === i ? null : i); } }}
                        >
                          {entry.universityName ? (
                            <span className="text-gray-900 font-medium flex items-center gap-1.5"><GraduationCap size={12} className="text-purple-400" />{entry.universityName}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">{entry.country ? "Select university (optional)…" : "Select country first"}</span>
                          )}
                          {canEdit && <ChevronDown size={13} className={`text-gray-400 transition-transform ${lcUniOpen === i ? "rotate-180" : ""}`} />}
                        </div>
                        {canEdit && lcUniOpen === i && entry.country && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <input
                                autoFocus
                                value={lcUniSearch[i] ?? ""}
                                onChange={(e) => setLcUniSearch((p) => p.map((v, idx) => idx === i ? e.target.value : v))}
                                placeholder={`Search ${entry.country} universities…`}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <ul className="max-h-44 overflow-y-auto">
                              {entry.universityName && (
                                <li>
                                  <button type="button" onClick={() => setLcUniversity(i, "")} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic">
                                    Clear selection
                                  </button>
                                </li>
                              )}
                              {filteredUnis.length === 0 ? (
                                <li className="px-3 py-3 text-xs text-gray-400 text-center">
                                  {unis.length === 0 ? "No universities listed for this country" : "No matches found"}
                                </li>
                              ) : filteredUnis.map((u) => (
                                <li key={u}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setLcUniversity(i, u); }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                      entry.universityName === u ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    {u}
                                    {entry.universityName === u && <span className="text-purple-500 text-xs">✓</span>}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={addLcEntry}
                    className="flex-1 py-2 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={12} /> Add Country
                  </button>
                  <button
                    type="button"
                    onClick={saveLeadCountries}
                    disabled={savingCountries}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                      countriesSaved
                        ? "bg-green-600 text-white"
                        : "bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white"
                    }`}
                  >
                    {savingCountries ? "Saving…" : countriesSaved ? "✓ Saved" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Notes & Comments</h2>
            <div className="space-y-3 mb-4">
              {lead.notes?.length === 0 && <p className="text-gray-400 text-sm">No notes yet</p>}
              {lead.notes?.map((n) => (
                <div key={n._id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{n.addedByName} · {getRoleLabel(n.addedByRole)}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{n.content}</p>
                </div>
              ))}
            </div>
            {canNote && (
              <div className="flex gap-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..." rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button onClick={addNote} disabled={addingNote || !note.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                  {addingNote ? "..." : "Add"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
              {lead.status?.replace("_", " ")}
            </span>
            {canUpdateStatus && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">Change Status:</p>
                {["heated", "hot", "warm", "out_of_contact"].map((s) => (
                  <button key={s} onClick={() => updateStatus(s)}
                    disabled={lead.status === s}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors
                      ${lead.status === s ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-600"}`}
                  >
                    {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Convert to Student — trigger button */}
          {canConvert && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <UserPlus size={15} className="text-green-600" />
                </div>
                <h2 className="font-semibold text-gray-900 text-sm">Convert to Student</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Assign countries &amp; universities, then convert this lead into a student profile.
              </p>
              <button
                onClick={() => setShowConvertModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <GraduationCap size={15} />
                Convert to Student
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Convert to Student Modal ── */}
      {showConvertModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConvertModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <GraduationCap size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Convert to Student</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Convert <span className="font-medium text-gray-600">{lead.name}</span> into a student record</p>
                </div>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Confirmation body */}
            <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-1">
                <UserPlus size={26} className="text-green-500" />
              </div>
              <p className="text-sm text-gray-700">
                Are you sure you want to convert <span className="font-semibold text-gray-900">{lead.name}</span> into a student record?
              </p>
              <p className="text-xs text-gray-400">This action will create a new student profile linked to this lead.</p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={convertToStudent}
                disabled={converting}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {converting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {converting ? "Converting…" : "Convert to Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
