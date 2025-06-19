import React from 'react';
import './Dashboard.css'; // Ensure the CSS file is imported
import restaurantPhoto from '../assets/restaurant-image.jpg'; // Correct way to import your image

function Dashboard() {
  return (
    <div className="restaurant-container">
      <header className="restaurant-header">
        <h1>Welcome to Our Restaurant!</h1>
        <p>Exquisite Flavors, Cozy Ambiance.</p>
      </header>

      <section className="about-us-section">
        <div className="about-us-content">
          <img src={restaurantPhoto} alt="Restaurant Interior" className="about-us-image" />
          <div className="about-us-text">
            <h2>About Us</h2>
            <p>At our restaurant, we pride ourselves on serving dishes crafted from the freshest ingredients, carefully selected from local farms. With talented chefs and a dedicated team, we are committed to providing a memorable dining experience for every guest.</p>
            <p>Our space is designed to create a comfortable and warm atmosphere, ideal for family meals, romantic dates, or gatherings with friends.</p>
          </div>
        </div>
      </section>

      <section className="highlights-section">
        <h2>Our Highlights</h2>
        <div className="highlight-cards">
          <div className="card">
            <span className="card-icon">&#x1F374;</span> {/* Fork and Knife emoji */}
            <h3>Diverse Cuisine</h3>
            <p>A rich menu featuring dishes from Asian to European, catering to all tastes.</p>
          </div>
          <div className="card">
            <span className="card-icon">&#x1F4CD;</span> {/* Location Pin emoji */}
            <h3>Prime Location</h3>
            <p>Located in the heart of the city, easily accessible with convenient parking.</p>
          </div>
          <div className="card">
            <span className="card-icon">&#x1F963;</span> {/* Birthday Cake emoji */}
            <h3>Event Space</h3>
            <p>An ideal venue for birthday parties, anniversaries, and private gatherings.</p>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <h2>Contact Us</h2>
        <p>Address: Khu pho 6, Phuong Linh Trung, Thanh pho Thu Duc, Tp Ho Chi Minh</p>
        <p>Phone: (84) 123456789</p>
        <p>Email: 4tgrabfood@gmail.com</p>
        <p>Opening Hours: Tuesday - Sunday, 10:00 AM - 10:00 PM</p>
      </section>

      
    </div>
  );
}

export default Dashboard;