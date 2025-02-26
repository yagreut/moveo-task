# CodingSync

[Live Demo](https://moveo-task-frontend-1gbw.onrender.com/)

CodingSync is a real-time web application designed for coding collaboration, enabling mentors (e.g., JavaScript lecturer Tom) and students to work together on code blocks.

The app features a sleek, dark-themed UI with role-based access for mentors (read-only) and students (editable), supporting live code updates, chat functionality, and solution matching with a celebratory smiley face.

## Tech Stack

**Frontend:** React.js, CSS  
**Backend:** Node.js, Express.js, MongoDB

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- npm (included with Node.js)

### Installation

#### Install dependencies

##### Install frontend dependencies
```sh
cd frontend
npm install
```

##### Install backend dependencies
```sh
cd ../backend
npm install
```

### Environment Setup
Create a `.env` file in the backend directory:

```sh
MONGODB_URI=your_mongodb_uri
PORT=5000
```

### Start the application

#### Backend:
```sh
cd backend
npm start
```

#### Frontend:
```sh
cd frontend
npm start
```

## Future Enhancements

- **User Authentication:** Implement login and signup functionality.
- **Code History Tracking:** Allow users to view and revert to previous versions of their code.
- **Multiple Room Support:** Enable multiple coding rooms for different topics or groups.
- **Voice & Video Chat:** Integrate real-time voice and video communication.
- **Code Execution Support:** Add the ability to execute code in a sandboxed environment.
- **Mobile Support:** Improve responsiveness for a seamless experience on mobile devices.

