# Source references

Retrieval date is Nov 13 2026 unless noted.

## Challenge and rules
- Challenge: Flame in Freefall — <https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/>
- Challenge video — <https://www.youtube.com/watch?v=AVuEiKxOpc0>
- 2026 Judging & Awards Guide — <https://www.spaceappschallenge.org/resources/judging-awards-guide>
- 2026 Project Submission Guide — <https://www.spaceappschallenge.org/resources/project-submission-guide/>
- Participant FAQs, which hold the SI definition — <https://www.spaceappschallenge.org/resources/participant-faqs/>
- 2025 Awards (prior-year reference) — <https://www.spaceappschallenge.org/2025/awards/>
- 2025 Judging Guidelines PDF (prior-year reference) — <https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf>
- Brand guidelines — <https://www.spaceappschallenge.org/brand/>

## NASA data and science
- NASA PSI repository, combustion search — <https://psi.nasa.gov/physci/repo/search?q=combustion>
- Each investigation's record URL, DOI and license — `data/SOURCE_CATALOG.csv`
- **NASA/TP-2015-216046**, *Detailed Results From the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011* (Dietrich, Ferkul, Bryg, Nayagam, Hicks) — <https://ntrs.nasa.gov/citations/20150023456>; local copy at `data/investigations/PSI-69_FLEX/raw/publications/NTRS-20150023456/20150023456.pdf`
- *Combustion in Reduced Gravity* ISS mini-book (NP-2015-10-034-JSC) — local at `data/challenge_resources/`
- NASA, A Researcher's Guide to ISS Combustion Science — <https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/>
- NASA Glenn Combustion Science — <https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/>
- LUCI simulated lunar-g results (NTRS) — <https://ntrs.nasa.gov/citations/20250010653>
- KC-135 partial-gravity flame spread (NTRS) — <https://ntrs.nasa.gov/citations/20010059376>
- PSI large-download process — <https://science.nasa.gov/uncategorized/new-file-download-process-for-large-requestspsi-new-file-download-process/>

## Technology
- OpenAI API pricing — <https://developers.openai.com/api/docs/pricing>
- OpenAI models — <https://developers.openai.com/api/docs/models>
- OpenAI Code Interpreter guide — <https://developers.openai.com/api/docs/guides/tools-code-interpreter>
- OpenAI function calling (Responses API) — <https://developers.openai.com/api/docs/guides/function-calling>
- OpenAI community report on auto-container billing — <https://community.openai.com/t/responses-api-excessive-charges-due-to-repetitive-container-creation-when-using-code-interpreter/1364328>
- Anthropic, *Introducing Contextual Retrieval* (2024) — hybrid BM25+embedding evidence — <https://www.anthropic.com/news/contextual-retrieval>
- Sandbox comparisons, secondary sources used for orientation only:
  - <https://manveerc.substack.com/p/ai-agent-sandboxing-guide>
  - <https://northflank.com/blog/self-hostable-alternatives-to-e2b-for-ai-agents>
- Libraries (cite in the submission References field):
  - Backend: FastAPI, Pydantic, Uvicorn, pandas, DuckDB, pint, PyMuPDF, openpyxl, xlrd, numpy, openai-python
  - Frontend: React, Vite, Tailwind CSS, Radix UI / shadcn/ui, Zustand, TanStack Query, Plotly.js, react-markdown
  - Media: FFmpeg
