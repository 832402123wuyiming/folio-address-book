# Cloud Deployment

The website consists of the files in `dist/`. The production demo runs on [GitHub Pages](https://832402123wuyiming.github.io/folio-address-book/). Its gh-pages branch publishes those files from the root directory. The steps below also work on a dedicated Ubuntu server with Nginx. The website needs no Node.js process, application database, or runtime credentials.

## Prepare the instance

1. Use an Ubuntu instance with a public IP in your chosen cloud account.
2. In the instance security group, permit inbound TCP port 80 for evaluation. Permit SSH on port 22 from your own IP.
3. Connect with an SSH account that can run `sudo`. The commands below assume a new instance dedicated to Folio, with Nginx's default website served from `/var/www/html`.

## Deploy

From the project directory on your computer, replace `USER` and `PUBLIC_IP` with the assigned SSH user and public IP.

```sh
tar -czf folio-site.tar.gz -C dist .
scp folio-site.tar.gz USER@PUBLIC_IP:~/
ssh USER@PUBLIC_IP
```

On the server, install Nginx and copy the site into its web root.

```sh
sudo apt-get update
sudo apt-get install -y nginx
sudo tar -xzf "$HOME/folio-site.tar.gz" -C /var/www/html
sudo nginx -t
sudo systemctl enable --now nginx
```

From the local machine, verify the homepage and JavaScript module MIME type. Then open the homepage in a browser and try **Load sample contacts** and **Export Excel**.

```sh
curl -fI http://PUBLIC_IP/
curl -fI http://PUBLIC_IP/app.mjs
```

If the module does not return a JavaScript Content-Type, add an `mjs` association to the active Nginx JavaScript type in `/etc/nginx/mime.types` (for example, `application/javascript js mjs;`), run `sudo nginx -t`, and reload Nginx. Share the public address once these checks pass.

[GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

