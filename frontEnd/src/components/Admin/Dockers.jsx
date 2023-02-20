import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppContext from "../Data/AppContext";

function Dockers(props) {
  const globalData = useContext(AppContext);
  const [dockers, setDockers] = useState([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);

  const getDockers = (index) => {
    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/getDockers",
        {
          page: index,
          search: searchQuery,
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Session expired!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else if (response.data.state == "error") {
          globalData.alert.error(response.data.message);
        } else {
            setDockers(response.data);
          setPage(index);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  useEffect(() => {
    getDockers(page);
  }, [searchQuery]);

  return (
    <div>
      <h1
        className="display-1 bold color_white"
        style={{ textAlign: "center", marginBottom: "50px" }}
      >
        DOCKERS
      </h1>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "25px",
        }}
      >
        <div>
          <button
            className="btn btn-outline-danger btn-shadow"
            onClick={() =>  getDockers(page - 1)}
          >
            <span className="fa-solid fa-arrow-left"></span>
          </button>
          <button
            className="btn btn-outline-danger btn-shadow"
            onClick={() =>  getDockers(page + 1)}
          >
            <span className="fa-solid fa-arrow-right"></span>
          </button>
          <button
            className="btn btn-outline-danger btn-shadow"
            onClick={() => setEditMode(!editMode)}
          >
            <span className="fa-solid fa-pencil"></span>
          </button>
        </div>
        {/* <div>
          <input
            type="text"
            className="form-control"
            id="searchQuery"
            placeholder="Search"
            onChange={(e) => {
              setPage(1);
              setSearchQuery(e.target.value);
            }}
          />
        </div> */}
      </div>
      <table className="table table-hover table-striped">
        <thead className="thead-dark hackerFont">
          <tr>
            <th scope="col" style={{ textAlign: "center" }}>
              #
            </th>
            <th scope="col">dockerId</th>
            <th scope="col">mappedPort</th>
            <th scope="col">deployTime</th>
            <th scope="col">randomFlag</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {dockers.map((docker, index) => {
            return (
              <tr key={docker.dockerId}>
                <th scope="row" style={{ textAlign: "center" }}>
                  {index + (page - 1) * 100}
                </th>
                <td>
                  {docker.dockerId}
                </td>
                <td>{docker.mappedPort}</td>
                <td>{docker.deployTime}</td>
                <td>{docker.randomFlag}</td>
                <td>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Dockers;
