import AceEditor from "react-ace";
import { useState } from "react";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-monokai";

function ChallengeCard(props) {
  const [code, setCode] = useState(props.challenge.codeSnippet);
  const [codeLanguage, setCodeLanguage] = useState(
    props.challenge.codeLanguage
  );
  const [challenge, setChallenge] = useState(props.challenge);

  return (
    <div
      style={{ flex: "0 0 100%", maxWidth: "50%" }}
      className="top"
      id={"challenge-top" + challenge._id}
    >
      <div
        className="col-md-6 mb-3"
        id={"challenge-card" + challenge._id}
        style={{ maxWidth: "100%" }}
      >
        <div
          className={
            challenge.category.toLowerCase() === "crypto"
              ? "card category_crypt"
              : challenge.category.toLowerCase() === "web"
              ? "card category_web"
              : challenge.category.toLowerCase() === "osint"
              ? "card category_osint"
              : challenge.category.toLowerCase() === "reverse"
              ? "card category_reverse"
              : challenge.category.toLowerCase() === "pwn"
              ? "card category_pwning"
              : challenge.category.toLowerCase() === "forensics"
              ? "card category_forensics"
              : "card category_misc"
          }
          id={"challenge" + challenge._id}
        >
          <div
            className="card-header"
            data-target={"#problem_id_" + challenge._id}
            data-toggle="collapse"
            aria-expanded="false"
            aria-controls={"problem_id_" + challenge._id}
            draggable="true"
            onDragStart={props.drag} // DO NOT REMOVE!
            id={"challenge-header" + challenge._id}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <div>
              {challenge.isInstance ? (
                <span
                  className="fa-brands fa-docker"
                  style={{ fontSize: "18px" }}
                ></span>
              ) : null}
              <span
                contentEditable="true"
                style={{ outline: "none" }}
                id={"name" + challenge._id}
                onClick={(e) => e.stopPropagation()}
              >
                {challenge.name}{" "}
              </span>
            </div>
            <span className="badge align-self-end">
              <span
                contentEditable="true"
                style={{ outline: "none" }}
                onClick={(e) => e.stopPropagation()}
                id={"points" + challenge._id}
              >
                {challenge.points}
              </span>{" "}
              points
            </span>
          </div>
          <div
            id={"problem_id_" + challenge._id}
            className="collapse card-body"
          >
            <blockquote className="card-blockquote">
              <h6 className="solvers">
                Solves:{" "}
                <span className="solver_num">{challenge.solveCount}</span>{" "}
                &nbsp;
              </h6>

              <hr />
              <div style={{ display: "block" }}>
                <span className="color_white">Hidden: </span>
                <span className="color_white">
                  <select
                    defaultValue={challenge.hidden.toString()}
                    id={"hidden" + challenge._id}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </span>
              </div>

              <hr />
              <div style={{ display: "block" }}>
                <span className="color_white">Difficulty: </span>
                <span className="color_white">
                  <select
                    defaultValue={challenge.level.toString()}
                    id={"level" + challenge._id}
                  >
                    <option value="0">Easy</option>
                    <option value="1">Medium</option>
                    <option value="2">Hard</option>
                    <option value="3">Ninja</option>
                  </select>
                </span>
              </div>

              <hr />
              <div style={{ display: "block" }}>
                <label>Info:</label>
                <p
                  contentEditable="true"
                  style={{
                    backgroundColor: "rgb(30, 32, 55)",
                    outline: "none",
                  }}
                  id={"info" + challenge._id}
                >
                  {challenge.info}
                </p>
              </div>

              <hr />
              {challenge.hints.map((hint, i) => {
                return (
                  <div key={hint.id}>
                    <p
                      style={{
                        display: "none",
                      }}
                      id={i + "hintId" + challenge._id}
                    >
                      {hint.id}
                    </p>
                    <div style={{ display: "block" }}>
                      <label>Hint#{i + 1}:</label>
                      <p
                        style={{
                          backgroundColor: "rgb(30, 32, 55)",
                          outline: "none",
                        }}
                        contentEditable="true"
                        id={i + "hintContent" + challenge._id}
                      >
                        {hint.content}
                      </p>
                    </div>

                    <div style={{ display: "flex" }}>
                      <label>Hint#{i + 1} Cost:</label>
                      <p
                        style={{
                          backgroundColor: "rgb(30, 32, 55)",
                          outline: "none",
                          minWidth: "5%",
                        }}
                        contentEditable="true"
                        id={i + "hintCost" + challenge._id}
                      >
                        {hint.cost}
                      </p>
                    </div>
                  </div>
                );
              })}
              <button
                id="submit_p2"
                className="btn btn-outline-danger"
                type="button"
                onClick={() => {
                  let updateChallenge = { ...challenge };
                  updateChallenge.hints.push({ id: Math.random().toString().substr(2, 4), content: "Easy Peazy", cost: 0});
                  setChallenge(updateChallenge)
                }}
              >
                Add Hint
              </button>

              <hr />
              <div style={{ display: "flex" }}>
                <label>First Blood Bonus:</label>
                <p
                  style={{
                    backgroundColor: "rgb(30, 32, 55)",
                    outline: "none",
                    minWidth: "5%",
                  }}
                  contentEditable="true"
                  id={"firstBloodPoints" + challenge._id}
                >
                  {challenge.firstBloodPoints}
                </p>
              </div>

              <hr />
              <div style={{ display: "block" }}>
                <label>File:</label>
                <select
                  defaultValue={challenge.file}
                  id={"file" + challenge._id}
                >
                  <option value="">None</option>
                  {props.assets.map((asset) => {
                    return (
                      <option value={asset.name} key={asset.name}>
                        {asset.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <hr />
              <label>Code Snippet:</label>
              <select
                defaultValue={challenge.codeLanguage || codeLanguage}
                id={"code_language" + challenge._id}
                onChange={(e) => setCodeLanguage(e.target.value)}
              >
                <option value="none">None</option>
                <option value="python">Python</option>
                <option value="javascript">Javascript</option>
              </select>
              {codeLanguage != "none" && (
                <AceEditor
                  style={{
                    height: "300px",
                    width: "100%",
                    marginBottom: "16px",
                  }}
                  placeholder="Write code here..."
                  mode={codeLanguage}
                  theme="monokai"
                  name={"code" + challenge._id}
                  onChange={(currentCode) => setCode(currentCode)}
                  fontSize={14}
                  showPrintMargin={true}
                  showGutter={true}
                  highlightActiveLine={true}
                  value={code}
                  setOptions={{
                    enableBasicAutocompletion: false,
                    enableLiveAutocompletion: false,
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                  }}
                />
              )}
              <p hidden id={"code_snippet" + challenge._id}>
                {code}
              </p>

              <hr />
              <div style={{ display: "block" }}>
                <label>Github URL:</label>
                <p
                  contentEditable="true"
                  style={{
                    backgroundColor: "rgb(30, 32, 55)",
                    outline: "none",
                  }}
                  id={"githubUrl" + challenge._id}
                >
                  {challenge.githubUrl}
                </p>
              </div>

              <div style={{ display: "block" }}>
                <label>isInstance:</label>
                <select
                  id={"isInstance" + challenge._id}
                  defaultValue={challenge.isInstance}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>

              {/* Only Show RandomFlag if Instance is On */}
              {challenge.isInstance.toString() == "true" ? (
                <div style={{ display: "block" }}>
                  <label for={"#randomFlag" + challenge._id}>
                    Random Flag:{" "}
                  </label>
                  <select
                    id={"randomFlag" + challenge._id}
                    defaultValue={challenge.randomFlag}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              ) : (
                <select
                  id={"randomFlag" + challenge._id}
                  defaultValue={challenge.randomFlag}
                  style={{
                    display: "none",
                  }}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              )}

              {props.dynamicScoring.toString() == "true" ? (
                <div style={{ display: "block" }}>
                  <hr />
                  <label>Minimum Points:</label>{" "}
                  <p
                    contentEditable="true"
                    style={{
                      backgroundColor: "rgb(30, 32, 55)",
                      outline: "none",
                    }}
                    id={"minimumPoints" + challenge._id}
                  >
                    {challenge.minimumPoints}
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    display: "none",
                  }}
                  id={"minimumPoints" + challenge._id}
                >
                  {challenge.minimumPoints}
                </p>
              )}

              <hr />
              {/* Only Show Flag if RandomFlag is Off */}
              {challenge.randomFlag.toString() == "false" ? (
                <div style={{ display: "block" }}>
                  <label>Flag:</label>
                  <p
                    contentEditable="true"
                    style={{
                      backgroundColor: "rgb(30, 32, 55)",
                      outline: "none",
                    }}
                    id={"flag" + challenge._id}
                  >
                    {challenge.flag}
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    display: "none",
                  }}
                  id={"flag" + challenge._id}
                >
                  {challenge.flag}
                </p>
              )}

              <hr />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <button
                  id="submit_p2"
                  className="btn btn-outline-danger"
                  type="button"
                  onClick={() => {
                    props.saveChallenge(challenge);
                  }}
                >
                  Save
                </button>
                <button
                  id="submit_p2"
                  className="btn btn-outline-danger"
                  data-toggle="modal"
                  data-target="#confirmModal"
                  onClick={(e) => {
                    props.setAction({
                      function: props.deleteChallenge,
                      e: e,
                      data: challenge,
                    });
                  }}
                >
                  Delete
                </button>
              </div>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChallengeCard;
