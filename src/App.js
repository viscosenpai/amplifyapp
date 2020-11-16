import React, { useState, useEffect } from "react";
import logo from './logo.svg';
import './App.css';
import { API, Storage } from "aws-amplify";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from "./graphql/mutations";

const initialFormState = { name: "", description: "" };

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }));
    setNotes(apiData.data.listNotes.items);
  };

  const createNote = async () => {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([...notes, formData]);
    setFormData(initialFormState);
  };

  const deleteNote = async ({ id }) => {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } } });
  };

  const fileSelectHandler = async (event) => {
    if (!event.target.files[0]) return;
    const file = event.target.files[0];
    setFormData({...formData, image: file.name});
    await Storage.put(file.name, file);
    fetchNotes();
  };

  const noteNameChangeHandler = (event) => {
    setFormData({ ...formData, "name": event.target.value })
  };

  const noteDescriptionChangeHandler = (event) => {
    setFormData({ ...formData, "description": event.target.value })
  };

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        value={formData.name}
        placeholder="Note Name"
        onChange={(event) => noteNameChangeHandler(event)} />
      <input
        value={formData.description}
        placeholder="Note Description"
        onChange={(event) => noteDescriptionChangeHandler(event)} />
      <input type="file" onChange={fileSelectHandler} />
      <button onClick={createNote}>Create Note</button>
      <div style={{marginBottom: "30px"}}>
        {notes.map(note => (
          <div key={note.id || note.name}>
            <h2>{note.name}</h2>
            <p>{note.description}</p>
            <button onClick={() => deleteNote(note)}>Delete Note</button>
            {
              note.image && <img src={note.image} alt={note.description} style={{width: "400px"}} />
            }
          </div>
        ))}
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
